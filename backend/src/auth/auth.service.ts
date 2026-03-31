import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly rolesService: RolesService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const roleExists = await this.rolesService.exists(dto.role);
    if (!roleExists) {
      throw new BadRequestException(`El rol "${dto.role}" no existe`);
    }

    const exists = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
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
    return this.userRepository.save(user);
  }

  async findByRole(role: string): Promise<Pick<User, 'id' | 'name'>[]> {
    return this.userRepository.find({
      where: { role },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
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
