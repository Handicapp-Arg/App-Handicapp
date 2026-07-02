import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Horse } from '../horses/horse.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { RolesService } from '../roles/roles.service';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RefreshToken } from './refresh-token.entity';
import { OrganizationInvitation } from '../organizations/organization-invitation.entity';
import { OrganizationMember, OrgMemberRole } from '../organizations/organization-member.entity';
import { generateUniqueJoinCode } from '../organizations/join-code.util';

/**
 * Mapea el rol dentro de la organización (role_in_org de la invitación) al
 * rol de plataforma (user.role). Todos los destinos existen en la tabla de roles.
 */
const ORG_ROLE_TO_USER_ROLE: Record<OrgMemberRole, string> = {
  jinete: 'jinete',
  peon: 'peon',
  encargado: 'encargado',
  vet: 'veterinario',
  owner_role: 'propietario',
  staff: 'establecimiento',
  admin: 'establecimiento',
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepository: Repository<OrganizationInvitation>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
    private readonly jwtService: JwtService,
    private readonly rolesService: RolesService,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /** Sube avatar o portada del usuario a Cloudinary, borra el anterior y persiste. */
  async uploadProfileImage(
    user: User,
    file: Express.Multer.File,
    kind: 'avatar' | 'cover',
  ): Promise<{ avatar_url: string | null; cover_url: string | null }> {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');

    const folder = kind === 'avatar' ? 'handicapp/avatars' : 'handicapp/covers';
    const result = await this.cloudinaryService.upload(file, folder);

    const urlField = kind === 'avatar' ? 'avatar_url' : 'cover_url';
    const idField = kind === 'avatar' ? 'avatar_public_id' : 'cover_public_id';

    const prevId = user[idField];
    if (prevId) {
      await this.cloudinaryService.delete(prevId).catch(() => undefined);
    }

    user[urlField] = result.secure_url;
    user[idField] = result.public_id;
    await this.userRepository.save(user);

    return { avatar_url: user.avatar_url, cover_url: user.cover_url };
  }

  /** Sube la foto de matrícula del veterinario a Cloudinary, borra la anterior y persiste. */
  async uploadVetLicense(user: User, file: Express.Multer.File): Promise<void> {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');

    const result = await this.cloudinaryService.upload(file, 'handicapp/licenses');

    const prevId = user.vet_license_public_id;
    if (prevId) {
      await this.cloudinaryService.delete(prevId).catch(() => undefined);
    }

    user.vet_license_url = result.secure_url;
    user.vet_license_public_id = result.public_id;
    await this.userRepository.save(user);
  }

  /** Guarda número/provincia de la matrícula y la deja pendiente de validación. */
  async submitVetLicense(
    user: User,
    data: { number?: string; province?: string },
  ): Promise<User> {
    if (data.number !== undefined) user.vet_license_number = data.number;
    if (data.province !== undefined) user.vet_province = data.province;
    user.vet_license_status = 'pending';
    await this.userRepository.save(user);
    return (await this.userRepository.findOne({ where: { id: user.id } })) ?? user;
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });

    const token = randomBytes(40).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({ token, user_id: user.id, expires_at: expires }),
    );

    return { accessToken, refreshToken: token };
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const { invitation_token, ...data } = dto;

    // Si viene un token de invitación, la validamos y el rol de plataforma se
    // deriva del role_in_org de la invitación (ignorando el rol del DTO).
    let invitation: OrganizationInvitation | null = null;
    let resolvedRole = data.role;

    if (invitation_token) {
      invitation = await this.invitationRepository.findOne({
        where: { token: invitation_token },
      });
      if (!invitation) {
        throw new BadRequestException('La invitación no es válida');
      }
      if (invitation.status !== 'pending') {
        throw new BadRequestException('La invitación ya no está disponible');
      }
      if (invitation.expires_at < new Date()) {
        await this.invitationRepository.update(invitation.id, { status: 'expired' });
        throw new BadRequestException('La invitación expiró');
      }
      if (invitation.email.toLowerCase() !== data.email.toLowerCase()) {
        throw new BadRequestException('El email no coincide con el de la invitación');
      }
      resolvedRole = ORG_ROLE_TO_USER_ROLE[invitation.role_in_org] ?? data.role;
    }

    const roleExists = await this.rolesService.exists(resolvedRole);
    if (!roleExists) {
      throw new BadRequestException(`El rol "${resolvedRole}" no existe`);
    }

    const exists = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = this.userRepository.create({
      ...data,
      role: resolvedRole,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Si se registró aceptando una invitación: sumarlo como miembro de la
    // organización con el role_in_org y marcar la invitación como aceptada.
    if (invitation) {
      const existingMember = await this.memberRepository.findOne({
        where: { organization_id: invitation.organization_id, user_id: savedUser.id },
      });
      if (!existingMember) {
        await this.memberRepository.save(
          this.memberRepository.create({
            organization_id: invitation.organization_id,
            user_id: savedUser.id,
            role_in_org: invitation.role_in_org,
          }),
        );
      }
      await this.invitationRepository.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date(),
      });
      // No creamos organización propia: el usuario se suma a la que lo invitó.
      return this.generateTokens(savedUser);
    }

    // Si es un establecimiento, crear automáticamente su organización
    if (savedUser.role === 'establecimiento') {
      try {
        const joinCode = await generateUniqueJoinCode(async (code) => {
          const rows: unknown[] = await this.userRepository.query(
            `SELECT 1 FROM organizations WHERE join_code = $1 LIMIT 1`,
            [code],
          );
          return rows.length > 0;
        });
        await this.userRepository.query(
          `INSERT INTO organizations (id, name, owner_id, plan, horse_limit, status, join_code, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'free', 3, 'active', $3, NOW(), NOW())
           RETURNING id`,
          [savedUser.name, savedUser.id, joinCode],
        );
        const org: { id: string }[] = await this.userRepository.query(
          `SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1`,
          [savedUser.id],
        );
        if (org[0]) {
          await this.userRepository.query(
            `INSERT INTO organization_members (id, organization_id, user_id, role_in_org, joined_at)
             VALUES (gen_random_uuid(), $1, $2, 'admin', NOW())
             ON CONFLICT DO NOTHING`,
            [org[0].id, savedUser.id],
          );
        }
      } catch {
        // No interrumpir el registro si falla la creación de la organización
      }
    }

    return this.generateTokens(savedUser);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const record = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!record || record.expires_at < new Date()) {
      if (record) await this.refreshTokenRepository.remove(record);
      throw new UnauthorizedException('Sesión expirada. Iniciá sesión nuevamente.');
    }

    // Rotación: invalidar el token usado y emitir uno nuevo
    await this.refreshTokenRepository.remove(record);
    return this.generateTokens(record.user);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.delete({ token });
  }

  async updateProfile(user: User, dto: UpdateProfileDto): Promise<User> {
    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (exists) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    Object.assign(user, dto);
    await this.userRepository.save(user);
    // Releer fresco: tras save() el entity en memoria puede quedar sin algunas
    // columnas (name/email), lo que rompía la respuesta de PATCH /profile.
    return (await this.userRepository.findOne({ where: { id: user.id } })) ?? user;
  }

  async getDirectorio(search?: string): Promise<{ id: string; name: string; avatar_color: string | null; horse_count: number }[]> {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.avatar_color'])
      .where('u.role = :role', { role: 'establecimiento' });

    if (search) {
      qb.andWhere('u.name ILIKE :s', { s: `%${search}%` });
    }

    qb.orderBy('u.name', 'ASC');
    const users = await qb.getMany();

    const horseCounts: { establishment_id: string; count: string }[] =
      await this.userRepository.query(
        `SELECT establishment_id, COUNT(*)::text as count FROM horses WHERE establishment_id IS NOT NULL GROUP BY establishment_id`,
      );

    const countMap = new Map(horseCounts.map((r) => [r.establishment_id, +r.count]));

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      avatar_color: u.avatar_color ?? null,
      horse_count: countMap.get(u.id) ?? 0,
    }));
  }

  async findByRole(role: string): Promise<Pick<User, 'id' | 'name'>[]> {
    return this.userRepository.find({
      where: { role },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.userRepository.update(userId, { push_token: token });
  }

  async lookupByEmail(email: string): Promise<{ id: string; name: string; role: string } | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: ['id', 'name', 'role'],
    });
    return user ? { id: user.id, name: user.name, role: user.role } : null;
  }

  async getAdminOverview(query: AdminQueryDto) {
    const { search, role, page = 1, limit = 10 } = query;

    const qb = this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.role', 'u.created_at'])
      .where('u.role != :adminRole', { adminRole: 'admin' });

    if (role) {
      qb.andWhere('u.role = :role', { role });
    }

    if (search) {
      qb.andWhere('(u.name ILIKE :s OR u.email ILIKE :s)', {
        s: `%${search}%`,
      });
    }

    qb.orderBy('u.role', 'ASC').addOrderBy('u.name', 'ASC');

    const total = await qb.getCount();
    const users = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const horseCounts: { owner_id: string; count: string }[] =
      await this.userRepository.query(
        `SELECT owner_id, COUNT(*)::text as count FROM horses GROUP BY owner_id`,
      );

    const establishmentCounts: { establishment_id: string; count: string }[] =
      await this.userRepository.query(
        `SELECT establishment_id, COUNT(*)::text as count FROM horses WHERE establishment_id IS NOT NULL GROUP BY establishment_id`,
      );

    const horseMap = new Map(horseCounts.map((r) => [r.owner_id, +r.count]));
    const estMap = new Map(
      establishmentCounts.map((r) => [r.establishment_id, +r.count]),
    );

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
      horse_count:
        u.role === 'propietario'
          ? (horseMap.get(u.id) ?? 0)
          : (estMap.get(u.id) ?? 0),
    }));

    return { data, total, page, limit };
  }

  async getAdminHorses(query: AdminQueryDto) {
    const { search, page = 1, limit = 10 } = query;

    const qb = this.userRepository.manager
      .getRepository(Horse)
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.owner', 'owner')
      .leftJoinAndSelect('h.establishment', 'establishment');

    if (search) {
      qb.where(
        '(h.name ILIKE :s OR owner.name ILIKE :s OR establishment.name ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy('h.created_at', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async getAdminStats() {
    const [propietarios, establecimientos, caballos] = await Promise.all([
      this.userRepository.count({ where: { role: 'propietario' } }),
      this.userRepository.count({ where: { role: 'establecimiento' } }),
      this.userRepository.manager.getRepository(Horse).count(),
    ]);
    return { propietarios, establecimientos, caballos };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    // Respuesta genérica — no revelar si el email existe
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.userRepository.update(user.id, {
      reset_token: token,
      reset_token_expires: expires,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.emailService.sendPasswordReset({ to: user.email, name: user.name, resetLink });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.reset_token')
      .addSelect('user.reset_token_expires')
      .where('user.reset_token = :token', { token })
      .getOne();

    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      throw new BadRequestException('El enlace de recuperación es inválido o expiró');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    });
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
    const fullUser = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: user.id })
      .getOne();

    if (!fullUser || !(await bcrypt.compare(dto.currentPassword, fullUser.password))) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt();
    fullUser.password = await bcrypt.hash(dto.newPassword, salt);
    await this.userRepository.save(fullUser);
  }
}
