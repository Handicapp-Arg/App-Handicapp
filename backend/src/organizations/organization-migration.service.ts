import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, Not } from 'typeorm';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { generateUniqueJoinCode } from './join-code.util';

/**
 * Migra automáticamente al modelo de organizaciones.
 * Idempotente — corre al inicio y solo actúa si hay establecimientos sin organización.
 *
 * Lógica:
 * 1. Por cada usuario con role='establecimiento' que NO tenga organización propia,
 *    crea una organización con su nombre, hereda el plan del usuario.
 * 2. Marca al usuario como member 'admin' de su propia organización.
 * 3. Para cada caballo cuyo establishment_id apunte a ese usuario,
 *    setea su organization_id a la nueva organización.
 * 4. Para cada propietario que tenga caballos en esa organización,
 *    lo agrega como member 'owner_role'.
 * 5. Para cada veterinario asignado vía HorseUser a caballos de esa organización,
 *    lo agrega como member 'vet'.
 */
@Injectable()
export class OrganizationMigrationService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationMigrationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.SKIP_ORG_MIGRATION === 'true') return;
    try {
      await this.migrate();
      await this.backfillJoinCodes();
      await this.downgradeExpiredPlans();
    } catch (err) {
      this.logger.error('Migración de organizaciones falló', err as Error);
    }
  }

  /** Genera un join_code único chequeando contra la tabla de organizaciones. */
  private async newJoinCode(): Promise<string> {
    return generateUniqueJoinCode(async (code) => {
      const exists = await this.orgRepo.findOne({ where: { join_code: code } });
      return !!exists;
    });
  }

  /** Asigna join_code a organizaciones existentes que aún no lo tengan. Idempotente. */
  private async backfillJoinCodes(): Promise<void> {
    const pending = await this.orgRepo.find({ where: { join_code: IsNull() } });
    if (!pending.length) return;
    this.logger.log(`Generando join_code para ${pending.length} organizaciones existentes...`);
    for (const org of pending) {
      org.join_code = await this.newJoinCode();
      await this.orgRepo.save(org);
    }
  }

  /**
   * Cron diario a las 3 AM: para cada organización con plan vencido y plan != free,
   * la baja a plan 'free' con horse_limit = 3 y limpia plan_expires_at.
   * También corre al startup para asegurar consistencia.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async downgradeExpiredPlans(): Promise<void> {
    const now = new Date();
    const expired = await this.orgRepo.find({
      where: {
        plan: Not('free' as any),
        plan_expires_at: LessThan(now),
      },
    });

    if (!expired.length) {
      this.logger.log('Sin organizaciones con plan vencido');
      return;
    }

    this.logger.log(`Bajando ${expired.length} organizaciones con plan vencido a Free...`);

    for (const org of expired) {
      org.plan = 'free';
      org.horse_limit = 3;
      org.plan_expires_at = null;
      await this.orgRepo.save(org);
      this.logger.log(`→ ${org.name} bajada a plan Free`);
    }
  }

  async migrate(): Promise<void> {
    // Buscar establecimientos sin organización propia
    const establishments = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin(Organization, 'o', 'o.owner_id = u.id')
      .where('u.role = :role', { role: 'establecimiento' })
      .andWhere('o.id IS NULL')
      .getMany();

    if (!establishments.length) {
      this.logger.log('Sin establecimientos pendientes de migrar');
      return;
    }

    this.logger.log(`Migrando ${establishments.length} establecimientos a organizaciones...`);

    for (const estab of establishments) {
      await this.migrateEstablishment(estab);
    }

    this.logger.log('✅ Migración de organizaciones completada');
  }

  private async migrateEstablishment(estab: User): Promise<void> {
    // 1. Crear organización (heredando el plan del usuario)
    const userPlan = (estab as any).plan ?? 'free';
    const planMap: Record<string, { plan: 'free' | 'basic' | 'pro' | 'enterprise'; horse_limit: number | null }> = {
      free:  { plan: 'free',  horse_limit: 3 },
      pro:   { plan: 'pro',   horse_limit: null },
    };
    const orgPlan = planMap[userPlan] ?? planMap.free;

    const org = await this.orgRepo.save(
      this.orgRepo.create({
        name: estab.name,
        owner_id: estab.id,
        plan: orgPlan.plan,
        horse_limit: orgPlan.horse_limit,
        status: 'active',
        join_code: await this.newJoinCode(),
        plan_expires_at: (estab as any).plan_expires_at ?? null,
      }),
    );

    // 2. El propio establecimiento es admin de su organización
    await this.memberRepo.save(
      this.memberRepo.create({
        organization_id: org.id,
        user_id: estab.id,
        role_in_org: 'admin',
      }),
    );

    // 3. Vincular caballos al organization_id
    const horses = await this.horseRepo.find({
      where: { establishment_id: estab.id, organization_id: IsNull() },
    });
    if (horses.length) {
      await this.horseRepo.update(
        { establishment_id: estab.id, organization_id: IsNull() },
        { organization_id: org.id },
      );
    }

    // 4. Agregar propietarios de esos caballos como miembros
    const ownerIds = [...new Set(horses.map((h) => h.owner_id))].filter((id) => id !== estab.id);
    for (const ownerId of ownerIds) {
      await this.memberRepo.save(
        this.memberRepo.create({
          organization_id: org.id,
          user_id: ownerId,
          role_in_org: 'owner_role',
        }),
      ).catch(() => {}); // ignora si ya existe (unique constraint)
    }

    // 5. Agregar vets asignados vía HorseUser
    const vetRows: { user_id: string }[] = await this.horseRepo.query(
      `SELECT DISTINCT hu.user_id
       FROM horse_users hu
       INNER JOIN horses h ON h.id = hu.horse_id
       WHERE h.organization_id = $1`,
      [org.id],
    );
    for (const row of vetRows) {
      if (row.user_id === estab.id) continue;
      await this.memberRepo.save(
        this.memberRepo.create({
          organization_id: org.id,
          user_id: row.user_id,
          role_in_org: 'vet',
        }),
      ).catch(() => {});
    }

    this.logger.log(
      `→ Org "${org.name}" creada (plan ${org.plan}) con ${horses.length} caballos y ${ownerIds.length + vetRows.length + 1} miembros`,
    );
  }
}
