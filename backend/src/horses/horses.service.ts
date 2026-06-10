import { randomBytes } from 'crypto';
import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryFailedError } from 'typeorm';
import { Horse } from './horse.entity';
import { HorseUser } from './horse-user.entity';
import { HorseMovement, MovementType } from './horse-movement.entity';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { UpdateOwnershipDto } from './dto/update-ownership.dto';
import { HorsesQueryDto } from './dto/horses-query.dto';
import { TransferHorseDto } from './dto/transfer-horse.dto';
import { AssignVetDto } from './dto/assign-vet.dto';
import { HorseDocument } from './horse-document.entity';
import { WeightRecord } from './weight-record.entity';
import { ShareToken } from './share-token.entity';
import { CreateWeightRecordDto } from './dto/create-weight-record.dto';
import { User } from '../auth/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PlansService } from '../plans/plans.service';
import { HorseRecordsService } from '../horse-records/horse-records.service';

@Injectable()
export class HorsesService implements OnModuleInit {
  constructor(
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    @InjectRepository(HorseDocument)
    private readonly documentRepository: Repository<HorseDocument>,
    @InjectRepository(WeightRecord)
    private readonly weightRepository: Repository<WeightRecord>,
    @InjectRepository(ShareToken)
    private readonly shareTokenRepository: Repository<ShareToken>,
    @InjectRepository(HorseMovement)
    private readonly movementRepository: Repository<HorseMovement>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly plansService: PlansService,
    private readonly horseRecordsService: HorseRecordsService,
  ) {}

  private async logMovement(horseId: string, type: MovementType, description: string, actorId?: string): Promise<void> {
    const movement = this.movementRepository.create({
      horse_id: horseId,
      type,
      description,
      actor_id: actorId ?? null,
    });
    await this.movementRepository.save(movement);
  }

  async getMovements(horseId: string, user: User): Promise<HorseMovement[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    return this.movementRepository.find({
      where: { horse_id: horseId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async onModuleInit() {
    await this.backfillHorseUsers();
    await this.ensurePublicTokens();
  }

  /**
   * One-time backfill: ensures every existing horse has its
   * owner and establishment in horse_users with correct roles.
   */
  private async backfillHorseUsers(): Promise<void> {
    const horses = await this.horseRepository.find();
    for (const horse of horses) {
      await this.syncHorseUsers(horse);
    }
  }

  async create(dto: CreateHorseDto, user: User): Promise<{ horse: Horse; record_matches: import('../horse-records/horse-record.entity').HorseRecord[] }> {
    let owner_id: string;
    let establishment_id: string | null = null;
    let organization_id: string | null = null;

    if (user.role === 'propietario') {
      owner_id = user.id;
      establishment_id = dto.establishment_id ?? null;
      // Si elige un establecimiento, intentamos resolver su organización
      if (establishment_id) {
        const orgRow: { id: string }[] = await this.horseRepository.query(
          `SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1`,
          [establishment_id],
        );
        organization_id = orgRow[0]?.id ?? null;
      }
      // Verificar límite — si va a una organización, chequea ese plan; si no, el individual
      await this.plansService.assertCanAddHorse(user, organization_id);
    } else if (user.role === 'establecimiento') {
      if (!dto.owner_id) {
        throw new BadRequestException(
          'El establecimiento debe indicar el owner_id del propietario',
        );
      }
      owner_id = dto.owner_id;
      establishment_id = user.id;
      // Resolver la organización del establecimiento (la creó la migración o el onboarding)
      const orgRow: { id: string }[] = await this.horseRepository.query(
        `SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1`,
        [user.id],
      );
      organization_id = orgRow[0]?.id ?? null;
      // Verificar límite del plan de la organización
      if (organization_id) {
        await this.plansService.assertCanAddHorse(user, organization_id);
      }
    } else {
      // Admin: requiere owner_id explícito
      if (!dto.owner_id) {
        throw new BadRequestException('El admin debe indicar el owner_id');
      }
      owner_id = dto.owner_id;
      establishment_id = dto.establishment_id ?? null;
      if (establishment_id) {
        const orgRow: { id: string }[] = await this.horseRepository.query(
          `SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1`,
          [establishment_id],
        );
        organization_id = orgRow[0]?.id ?? null;
      }
    }

    const nameDupe = await this.horseRepository
      .createQueryBuilder('h')
      .where('LOWER(h.name) = LOWER(:name)', { name: dto.name })
      .andWhere('h.owner_id = :owner_id', { owner_id })
      .select('h.id')
      .getOne();
    if (nameDupe) {
      throw new BadRequestException(
        `Ya tenés un caballo registrado con ese nombre`,
      );
    }

    if (dto.microchip) {
      const exists = await this.horseRepository.findOne({
        where: { microchip: dto.microchip },
        select: ['id'],
      });
      if (exists) {
        throw new BadRequestException(
          'Ya existe un caballo con ese microchip',
        );
      }
    }

    const horse = this.horseRepository.create({
      name: dto.name,
      birth_date: dto.birth_date ?? null,
      owner_id,
      establishment_id,
      organization_id,
      microchip: dto.microchip ?? null,
      breed_id: dto.breed_id ?? null,
      activity_id: dto.activity_id ?? null,
    });

    let saved: Horse;
    try {
      saved = await this.horseRepository.save(horse);
    } catch (err) {
      // Race condition: unique violation slipped past the pre-check
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new BadRequestException(
          'Ya existe un caballo con ese microchip',
        );
      }
      throw err;
    }
    await this.syncHorseUsers(saved);
    await this.logMovement(saved.id, 'created', 'Caballo registrado en HandicApp', user.id);

    const birthYear = dto.birth_date ? new Date(dto.birth_date).getFullYear() : undefined;
    const { items: record_matches } = await this.horseRecordsService.search({
      name: dto.name,
      birth_year: birthYear,
      limit: 3,
      offset: 0,
    }).then(({ items }) => ({
      items: items.filter(r => r.ownership_status !== 'verified'),
    })).catch(() => ({ items: [] }));

    return { horse: saved, record_matches };
  }

  async findAll(user: User, query: HorsesQueryDto = {}): Promise<Horse[]> {
    const { search } = query;

    const buildQb = (baseAlias: string) =>
      this.horseRepository
        .createQueryBuilder(baseAlias)
        .leftJoinAndSelect(`${baseAlias}.owner`, 'owner')
        .leftJoinAndSelect(`${baseAlias}.establishment`, 'establishment')
        .leftJoinAndSelect(`${baseAlias}.horseUsers`, 'horseUsers')
        .leftJoinAndSelect(`${baseAlias}.breed`, 'breed')
        .leftJoinAndSelect(`${baseAlias}.activity`, 'activity');

    const applySearch = (qb: ReturnType<typeof buildQb>, alias: string) => {
      if (search) {
        qb.andWhere(
          `(${alias}.name ILIKE :s OR owner.name ILIKE :s OR ${alias}.microchip ILIKE :s)`,
          { s: `%${search}%` },
        );
      }
      return qb;
    };

    if (user.role === 'admin') {
      const qb = applySearch(buildQb('h'), 'h');
      const horses = await qb.getMany();
      return horses.map((h) => this.attachCoOwners(h));
    }

    // Resolver IDs de organizaciones donde el usuario es miembro
    const memberRows: { organization_id: string }[] = await this.horseRepository.query(
      `SELECT organization_id FROM organization_members WHERE user_id = $1`,
      [user.id],
    );
    const orgIds = memberRows.map((r) => r.organization_id);

    if (user.role === 'propietario') {
      const ownedQb = applySearch(buildQb('h'), 'h').andWhere('h.owner_id = :uid', { uid: user.id });
      const ownedHorses = await ownedQb.getMany();

      const coOwnerEntries = await this.horseUserRepository.find({
        where: { user_id: user.id, role: 'owner' },
      });
      const coOwnedHorseIds = coOwnerEntries
        .map((hu) => hu.horse_id)
        .filter((hid) => !ownedHorses.some((h) => h.id === hid));

      let coOwnedHorses: Horse[] = [];
      if (coOwnedHorseIds.length) {
        const coQb = applySearch(buildQb('h'), 'h').andWhere('h.id IN (:...ids)', { ids: coOwnedHorseIds });
        coOwnedHorses = await coQb.getMany();
      }

      return [...ownedHorses, ...coOwnedHorses].map((h) => this.attachCoOwners(h));
    }

    if (user.role === 'establecimiento') {
      // Caballos donde es establishment_id directo O caballos en alguna de sus organizaciones
      const qb = applySearch(buildQb('h'), 'h');
      if (orgIds.length) {
        qb.andWhere('(h.establishment_id = :uid OR h.organization_id IN (:...orgIds))', { uid: user.id, orgIds });
      } else {
        qb.andWhere('h.establishment_id = :uid', { uid: user.id });
      }
      const horses = await qb.getMany();
      return horses.map((h) => this.attachCoOwners(h));
    }

    // veterinario: caballos asignados vía horse_users + caballos de organizaciones donde sea miembro
    const assignments = await this.horseUserRepository.find({
      where: { user_id: user.id },
    });
    const assignedIds = assignments.map((a) => a.horse_id);

    if (orgIds.length) {
      const qb = applySearch(buildQb('h'), 'h');
      if (assignedIds.length) {
        qb.andWhere('(h.id IN (:...ids) OR h.organization_id IN (:...orgIds))', { ids: assignedIds, orgIds });
      } else {
        qb.andWhere('h.organization_id IN (:...orgIds)', { orgIds });
      }
      const horses = await qb.getMany();
      return horses.map((h) => this.attachCoOwners(h));
    }

    if (!assignments.length) return [];
    const qb = applySearch(buildQb('h'), 'h').andWhere('h.id IN (:...ids)', { ids: assignedIds });
    const horses = await qb.getMany();
    return horses.map((h) => this.attachCoOwners(h));
  }

  async transfer(id: string, dto: TransferHorseDto, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException('Solo el propietario principal puede transferir el caballo');
    }

    if (dto.new_owner_id === horse.owner_id) {
      throw new BadRequestException('El nuevo propietario es el mismo que el actual');
    }

    // Registrar al dueño anterior como horse_user con role='prev_owner' para historial
    const prevOwnerEntry = await this.horseUserRepository.findOne({
      where: { horse_id: id, user_id: horse.owner_id, role: 'owner' },
    });
    if (prevOwnerEntry) {
      prevOwnerEntry.role = 'prev_owner';
      prevOwnerEntry.percentage = null;
      await this.horseUserRepository.save(prevOwnerEntry);
    }

    const prevOwnerId = horse.owner_id;
    horse.owner_id = dto.new_owner_id;
    const saved = await this.horseRepository.save(horse);
    await this.syncHorseUsers(saved);
    await this.logMovement(id, 'transfer_ownership',
      `Propiedad transferida del propietario anterior al nuevo propietario`, user.id);
    return saved;
  }

  async exportExpenses(id: string, user: User): Promise<string> {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const rows: { date: string; type: string; description: string; amount: string | null; expense_category: string | null }[] =
      await this.horseRepository.query(
        `SELECT date, type, description, amount::text, expense_category
         FROM events
         WHERE horse_id = $1 AND deleted_at IS NULL
         ORDER BY date DESC`,
        [id],
      );

    const typeLabels: Record<string, string> = {
      salud: 'Salud',
      entrenamiento: 'Entrenamiento',
      gasto: 'Gasto',
      nota: 'Nota',
    };

    const categoryLabels: Record<string, string> = {
      alimentacion: 'Alimentación',
      veterinario: 'Veterinario',
      herradero: 'Herradero',
      entrenamiento: 'Entrenamiento',
      mantenimiento: 'Mantenimiento',
      transporte: 'Transporte',
      otros: 'Otros',
    };

    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'].map(escapeCell).join(',');
    const lines = rows.map((r) =>
      [
        escapeCell(r.date),
        escapeCell(typeLabels[r.type] ?? r.type),
        escapeCell(r.expense_category ? (categoryLabels[r.expense_category] ?? r.expense_category) : ''),
        escapeCell(r.description),
        r.amount != null ? escapeCell(parseFloat(r.amount).toFixed(2)) : '""',
      ].join(','),
    );

    return [header, ...lines].join('\n');
  }

  async getFinancialSummary(id: string, user: User) {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const rows: { month: string; total: string }[] = await this.horseRepository.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount)::text AS total
       FROM events
       WHERE horse_id = $1 AND type = 'gasto' AND amount IS NOT NULL AND deleted_at IS NULL
       GROUP BY month
       ORDER BY month DESC
       LIMIT 24`,
      [id],
    );

    const byCategory: { category: string; total: string }[] = await this.horseRepository.query(
      `SELECT COALESCE(expense_category, 'otros') AS category, SUM(amount)::text AS total
       FROM events
       WHERE horse_id = $1 AND type = 'gasto' AND amount IS NOT NULL AND deleted_at IS NULL
       GROUP BY category
       ORDER BY total DESC`,
      [id],
    );

    const recentExpenses: { id: string; date: string; description: string; amount: string; expense_category: string | null }[] =
      await this.horseRepository.query(
        `SELECT id, date, description, amount::text, expense_category
         FROM events
         WHERE horse_id = $1 AND type = 'gasto' AND amount IS NOT NULL AND deleted_at IS NULL
         ORDER BY date DESC
         LIMIT 10`,
        [id],
      );

    const total = rows.reduce((acc, r) => acc + parseFloat(r.total), 0);
    const months = rows.length;
    const average_monthly = months > 0 ? total / months : 0;

    return {
      total: parseFloat(total.toFixed(2)),
      average_monthly: parseFloat(average_monthly.toFixed(2)),
      by_category: byCategory.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
      monthly: rows.map((r) => ({ month: r.month, total: parseFloat(r.total) })),
      recent_expenses: recentExpenses.map((r) => ({
        id: r.id,
        date: r.date,
        description: r.description,
        amount: parseFloat(r.amount),
        expense_category: r.expense_category,
      })),
    };
  }

  async findOne(id: string, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({
      where: { id },
      relations: ['owner', 'establishment', 'events', 'horseUsers', 'breed', 'activity'],
    });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    await this.assertAccess(horse, user);

    return this.attachCoOwners(horse);
  }

  async update(id: string, dto: UpdateHorseDto, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    await this.assertAccess(horse, user);

    if (dto.microchip && dto.microchip !== horse.microchip) {
      const exists = await this.horseRepository.findOne({
        where: { microchip: dto.microchip },
        select: ['id'],
      });
      if (exists && exists.id !== horse.id) {
        throw new BadRequestException(
          'Ya existe un caballo con ese microchip',
        );
      }
    }

    Object.assign(horse, dto);
    let saved: Horse;
    try {
      saved = await this.horseRepository.save(horse);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new BadRequestException(
          'Ya existe un caballo con ese microchip',
        );
      }
      throw err;
    }

    // Re-sync if owner or establishment changed
    if (dto.establishment_id !== undefined) {
      await this.syncHorseUsers(saved);
    }

    return saved;
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File,
    user: User,
  ): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    // Eliminar imagen anterior si existe
    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    const result = await this.cloudinaryService.upload(file);
    horse.image_url = result.secure_url;
    horse.image_public_id = result.public_id;

    return this.horseRepository.save(horse);
  }

  async removeImage(id: string, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    horse.image_url = null;
    horse.image_public_id = null;

    return this.horseRepository.save(horse);
  }

  async remove(id: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id } });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    await this.assertAccess(horse, user);

    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    await this.horseRepository.remove(horse);
    // horse_users se borran por CASCADE
  }

  // ── Ownership (tenencia) ──────────────────────────────────

  async getOwnership(
    horseId: string,
    user: User,
  ): Promise<HorseUser[]> {
    const horse = await this.horseRepository.findOne({
      where: { id: horseId },
    });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    return this.horseUserRepository.find({
      where: { horse_id: horseId, role: 'owner' },
    });
  }

  async updateOwnership(
    horseId: string,
    dto: UpdateOwnershipDto,
    user: User,
  ): Promise<HorseUser[]> {
    const horse = await this.horseRepository.findOne({
      where: { id: horseId },
    });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    // Solo el owner principal o admin pueden gestionar tenencia
    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException(
        'Solo el propietario principal puede gestionar la tenencia',
      );
    }

    // Validar que el owner principal esté incluido
    if (!dto.owners.some((o) => o.user_id === horse.owner_id)) {
      throw new BadRequestException(
        'El propietario principal debe estar incluido en la tenencia',
      );
    }

    // Validar suma = 100
    const total = dto.owners.reduce((sum, o) => sum + o.percentage, 0);
    if (total !== 100) {
      throw new BadRequestException(
        `Los porcentajes deben sumar 100% (actual: ${total}%)`,
      );
    }

    // Verificar que no haya user_ids duplicados
    const uniqueIds = new Set(dto.owners.map((o) => o.user_id));
    if (uniqueIds.size !== dto.owners.length) {
      throw new BadRequestException('No puede haber propietarios duplicados');
    }

    // Eliminar registros de ownership actuales
    await this.horseUserRepository.delete({
      horse_id: horseId,
      role: 'owner',
    });

    // Crear nuevos registros de ownership
    const newEntries = dto.owners.map((o) =>
      this.horseUserRepository.create({
        horse_id: horseId,
        user_id: o.user_id,
        percentage: o.percentage,
        role: 'owner',
      }),
    );

    await this.horseUserRepository.save(newEntries);

    // Asegurar que los co-propietarios también tengan acceso
    // (ya están en horse_users con role='owner', no necesitan 'access' duplicado)

    return this.horseUserRepository.find({
      where: { horse_id: horseId, role: 'owner' },
    });
  }

  // ── Peso ─────────────────────────────────────────────────

  async getWeightRecords(horseId: string, user: User): Promise<WeightRecord[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    return this.weightRepository.find({
      where: { horse_id: horseId },
      order: { date: 'DESC' },
    });
  }

  async addWeightRecord(horseId: string, dto: CreateWeightRecordDto, user: User): Promise<WeightRecord> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const record = this.weightRepository.create({
      horse_id: horseId,
      weight_kg: parseFloat(dto.weight_kg),
      body_condition: dto.body_condition ?? null,
      date: dto.date,
      notes: dto.notes ?? null,
      recorded_by: user.id,
    });
    return this.weightRepository.save(record);
  }

  async deleteWeightRecord(horseId: string, recordId: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    const record = await this.weightRepository.findOne({ where: { id: recordId, horse_id: horseId } });
    if (!record) throw new NotFoundException('Registro no encontrado');
    await this.weightRepository.remove(record);
  }

  // ── Compartir historial ───────────────────────────────────

  async createShareToken(horseId: string, user: User): Promise<{ token: string; expires_at: Date }> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    // Limpiar tokens expirados del mismo caballo
    await this.shareTokenRepository.delete({ horse_id: horseId });

    const token = randomBytes(24).toString('hex');
    const expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    await this.shareTokenRepository.save(
      this.shareTokenRepository.create({ token, horse_id: horseId, created_by: user.id, expires_at }),
    );

    return { token, expires_at };
  }

  async getPublicHorseHistory(token: string) {
    const shareToken = await this.shareTokenRepository.findOne({ where: { token } });

    if (!shareToken || shareToken.expires_at < new Date()) {
      throw new NotFoundException('El enlace es inválido o expiró');
    }

    const horse = await this.horseRepository.findOne({
      where: { id: shareToken.horse_id },
      relations: ['owner', 'establishment', 'breed', 'activity'],
    });

    if (!horse) throw new NotFoundException('Caballo no encontrado');

    const events = await this.horseRepository.manager
      .getRepository('events')
      .find({
        where: { horse_id: horse.id },
        order: { date: 'DESC' },
        take: 50,
      } as any);

    const weights = await this.weightRepository.find({
      where: { horse_id: horse.id },
      order: { date: 'DESC' },
      take: 20,
    });

    return { horse, events, weights, expires_at: shareToken.expires_at };
  }

  async getPublicProfile(publicToken: string) {
    const horse = await this.horseRepository.findOne({
      where: { public_token: publicToken },
      relations: ['owner', 'establishment', 'breed', 'activity'],
    });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    const events = await this.horseRepository.manager
      .getRepository('events')
      .find({
        where: { horse_id: horse.id, deleted_at: null },
        relations: ['photos'],
        order: { date: 'DESC' },
        take: 30,
      } as any);

    const weights = await this.weightRepository.find({
      where: { horse_id: horse.id },
      order: { date: 'DESC' },
      take: 10,
    });

    const medicalRecords = await this.horseRepository.manager
      .getRepository('medical_records')
      .find({
        where: { horse_id: horse.id },
        order: { date: 'DESC' },
        take: 20,
      } as any);

    return {
      id: horse.id,
      name: horse.name,
      birth_date: horse.birth_date,
      image_url: horse.image_url,
      microchip: horse.microchip,
      breed: horse.breed ? { name: horse.breed.name } : null,
      activity: horse.activity ? { name: horse.activity.name } : null,
      owner: { name: horse.owner.name },
      establishment: horse.establishment ? { name: horse.establishment.name } : null,
      events: events.map((e: any) => ({
        id: e.id, type: e.type, description: e.description, date: e.date,
        amount: e.type === 'gasto' ? e.amount : null,
        is_public: e.is_public,
        photos: (e.photos ?? [])
          .filter((p: any) => p.file_type === 'image' || p.file_type === 'video')
          .map((p: any) => ({ id: p.id, url: p.url, file_type: p.file_type })),
      })),
      weights: weights.map((w) => ({
        id: w.id, weight_kg: w.weight_kg, body_condition: w.body_condition, date: w.date,
      })),
      medical: medicalRecords.map((m: any) => ({
        id: m.id, type: m.type, name: m.name, date: m.date, next_due: m.next_due,
      })),
    };
  }

  async ensurePublicTokens(): Promise<void> {
    const { randomUUID } = await import('crypto');
    const horses = await this.horseRepository
      .createQueryBuilder('horse')
      .where('horse.public_token IS NULL')
      .getMany();
    for (const horse of horses) {
      await this.horseRepository.update(horse.id, { public_token: randomUUID() });
    }
  }

  // ── Documentos ───────────────────────────────────────────

  async getDocuments(horseId: string, user: User): Promise<HorseDocument[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);
    return this.documentRepository.find({
      where: { horse_id: horseId },
      order: { created_at: 'DESC' },
    });
  }

  async uploadDocument(
    horseId: string,
    file: Express.Multer.File,
    name: string,
    user: User,
  ): Promise<HorseDocument> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const isPdf = file.mimetype === 'application/pdf';
    const result = await this.cloudinaryService.upload(
      file,
      'handicapp/documents',
      { isPdf },
    );

    const doc = this.documentRepository.create({
      horse_id: horseId,
      name: name || file.originalname,
      url: result.secure_url,
      public_id: result.public_id,
      file_type: isPdf ? 'pdf' : 'image',
    });
    return this.documentRepository.save(doc);
  }

  async deleteDocument(horseId: string, docId: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    const doc = await this.documentRepository.findOne({
      where: { id: docId, horse_id: horseId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    await this.cloudinaryService.delete(
      doc.public_id,
      doc.file_type === 'pdf' ? 'raw' : 'image',
    );
    await this.documentRepository.remove(doc);
  }

  // ── Veterinarios ─────────────────────────────────────────

  async getVets(horseId: string, user: User): Promise<HorseUser[]> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    return this.horseUserRepository.find({
      where: { horse_id: horseId, role: 'vet' },
      relations: ['user'],
    });
  }

  async assignVet(horseId: string, dto: AssignVetDto, user: User): Promise<HorseUser> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException('Solo el propietario o admin puede asignar veterinarios');
    }

    const existing = await this.horseUserRepository.findOne({
      where: { horse_id: horseId, user_id: dto.user_id },
    });
    if (existing) {
      if (existing.role === 'vet') {
        throw new BadRequestException('El veterinario ya está asignado a este caballo');
      }
      existing.role = 'vet';
      return this.horseUserRepository.save(existing);
    }

    const entry = this.horseUserRepository.create({
      horse_id: horseId,
      user_id: dto.user_id,
      role: 'vet',
      percentage: null,
    });
    const saved = await this.horseUserRepository.save(entry);
    await this.logMovement(horseId, 'vet_assigned', 'Veterinario asignado al caballo', user.id);
    return saved;
  }

  async removeVet(horseId: string, vetUserId: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id: horseId } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException('Solo el propietario o admin puede remover veterinarios');
    }

    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horseId, user_id: vetUserId, role: 'vet' },
    });
    if (!entry) throw new NotFoundException('Veterinario no asignado a este caballo');

    await this.horseUserRepository.remove(entry);
    await this.logMovement(horseId, 'vet_removed', 'Veterinario desasignado del caballo', user.id);
  }

  // ── Private helpers ───────────────────────────────────────

  /**
   * Syncs the horse_users table with owner_id and establishment_id.
   * Keeps manually-added users (other roles) intact.
   */
  private async syncHorseUsers(horse: Horse): Promise<void> {
    const existing = await this.horseUserRepository.find({
      where: { horse_id: horse.id },
    });

    const existingByUserId = new Map(existing.map((hu) => [hu.user_id, hu]));

    // Ensure owner has an 'owner' role entry
    const ownerEntry = existingByUserId.get(horse.owner_id);
    if (!ownerEntry) {
      // Check if any ownership entries exist for this horse
      const hasOwnership = existing.some((hu) => hu.role === 'owner');
      await this.horseUserRepository.save(
        this.horseUserRepository.create({
          horse_id: horse.id,
          user_id: horse.owner_id,
          role: 'owner',
          percentage: hasOwnership ? null : 100,
        }),
      );
    } else if (ownerEntry.role !== 'owner') {
      // Upgrade existing access entry to owner
      const hasOtherOwners = existing.some(
        (hu) => hu.role === 'owner' && hu.user_id !== horse.owner_id,
      );
      ownerEntry.role = 'owner';
      if (!hasOtherOwners) ownerEntry.percentage = 100;
      await this.horseUserRepository.save(ownerEntry);
    }

    // Ensure establishment has an 'access' entry
    if (horse.establishment_id) {
      const estEntry = existingByUserId.get(horse.establishment_id);
      if (!estEntry) {
        await this.horseUserRepository.save(
          this.horseUserRepository.create({
            horse_id: horse.id,
            user_id: horse.establishment_id,
            role: 'access',
            percentage: null,
          }),
        );
      }
    }
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;

    // Propietario directo
    if (horse.owner_id === user.id) return;

    // Establecimiento directo (legacy: campo establishment_id)
    if (user.role === 'establecimiento' && horse.establishment_id === user.id) {
      // Si tiene organización, validar que no esté suspendida
      if (horse.organization_id) await this.assertOrgNotSuspended(horse.organization_id);
      return;
    }

    // Co-owner o veterinario asignado vía horse_users
    const entry = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id },
    });
    if (entry) return;

    // Acceso vía organización: si el caballo pertenece a una org y el usuario
    // es miembro de esa org, tiene acceso (todos los roles_in_org pueden ver).
    // Si la org está suspendida, solo bloqueamos a admin/staff (los que escriben).
    if (horse.organization_id) {
      const orgMember: { user_id: string; role_in_org: string }[] = await this.horseRepository.query(
        `SELECT user_id, role_in_org FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
        [horse.organization_id, user.id],
      );
      if (orgMember.length > 0) {
        const role = orgMember[0].role_in_org;
        // Bloquear admin/staff si la org está suspendida (no pueden escribir).
        // Propietarios y vets siguen viendo aunque esté suspendida.
        if (role === 'admin' || role === 'staff') {
          await this.assertOrgNotSuspended(horse.organization_id);
        }
        return;
      }
    }

    throw new ForbiddenException('No tenés acceso a este caballo');
  }

  private async assertOrgNotSuspended(orgId: string): Promise<void> {
    const rows: { status: string }[] = await this.horseRepository.query(
      `SELECT status FROM organizations WHERE id = $1 LIMIT 1`,
      [orgId],
    );
    if (rows[0]?.status === 'suspended') {
      throw new ForbiddenException(
        'Esta organización está suspendida. Contactá al administrador de HandicApp para reactivarla.',
      );
    }
  }

  private attachCoOwners(horse: Horse): Horse {
    if (horse.horseUsers) {
      (horse as any).co_owners = horse.horseUsers
        .filter((hu) => hu.role === 'owner')
        .map((hu) => ({
          id: hu.id,
          user_id: hu.user_id,
          percentage: hu.percentage ? Number(hu.percentage) : null,
          user: hu.user
            ? { id: hu.user.id, name: hu.user.name, email: hu.user.email }
            : undefined,
        }));
      delete (horse as any).horseUsers;
    }
    return horse;
  }
}
