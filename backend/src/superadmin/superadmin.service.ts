import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationPlan, OrganizationStatus } from '../organizations/organization.entity';
import { OrganizationMember } from '../organizations/organization-member.entity';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { PLAN_LIMITS } from '../plans/plans.service';

const PLAN_PRICES_ARS: Record<OrganizationPlan, number> = {
  free:       0,
  basic:      25_000,
  pro:        60_000,
  enterprise: 150_000,
};

@Injectable()
export class SuperAdminService {
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

  private assertSuperAdmin(user: User): void {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Solo el superadmin puede hacer esta acción');
    }
  }

  // ─── Listado de organizaciones ───
  async listOrganizations(user: User, query: { search?: string; plan?: string; status?: string }) {
    this.assertSuperAdmin(user);

    const qb = this.orgRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.owner', 'owner')
      .orderBy('o.created_at', 'DESC');

    if (query.search) {
      qb.andWhere('(o.name ILIKE :s OR owner.email ILIKE :s)', { s: `%${query.search}%` });
    }
    if (query.plan) qb.andWhere('o.plan = :plan', { plan: query.plan });
    if (query.status) qb.andWhere('o.status = :st', { st: query.status });

    const orgs = await qb.getMany();

    return Promise.all(orgs.map(async (o) => {
      const horse_count = await this.horseRepo.count({ where: { organization_id: o.id } });
      const member_count = await this.memberRepo.count({ where: { organization_id: o.id } });
      const isExpired = o.plan_expires_at && o.plan_expires_at < new Date();
      return {
        id: o.id,
        name: o.name,
        plan: isExpired ? 'free' : o.plan,
        status: o.status,
        plan_expires_at: o.plan_expires_at,
        horse_count,
        member_count,
        owner: o.owner ? { id: o.owner.id, name: o.owner.name, email: o.owner.email } : null,
        created_at: o.created_at,
        monthly_revenue_ars: isExpired ? 0 : (PLAN_PRICES_ARS[o.plan] ?? 0),
      };
    }));
  }

  // ─── Métricas globales ───
  async getMetrics(user: User) {
    this.assertSuperAdmin(user);

    const [orgs, totalUsers, totalHorses] = await Promise.all([
      this.orgRepo.find(),
      this.userRepo.count(),
      this.horseRepo.count(),
    ]);

    const now = new Date();
    const activeOrgs = orgs.filter((o) => o.status === 'active' && (!o.plan_expires_at || o.plan_expires_at > now));

    let mrr_ars = 0;
    const byPlan: Record<string, number> = { free: 0, basic: 0, pro: 0, enterprise: 0 };
    for (const o of activeOrgs) {
      mrr_ars += PLAN_PRICES_ARS[o.plan] ?? 0;
      byPlan[o.plan] = (byPlan[o.plan] ?? 0) + 1;
    }

    // Crecimiento últimos 30 días
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newOrgs30d = orgs.filter((o) => o.created_at >= thirtyDaysAgo).length;

    // Suspended / expired
    const suspended = orgs.filter((o) => o.status === 'suspended').length;
    const expired = orgs.filter((o) => o.plan_expires_at && o.plan_expires_at < now && o.plan !== 'free').length;

    return {
      total_organizations: orgs.length,
      active_organizations: activeOrgs.length,
      total_users: totalUsers,
      total_horses: totalHorses,
      mrr_ars,
      arr_ars: mrr_ars * 12,
      by_plan: byPlan,
      new_orgs_30d: newOrgs30d,
      suspended_count: suspended,
      expired_count: expired,
      avg_horses_per_org: orgs.length ? Math.round((totalHorses / orgs.length) * 10) / 10 : 0,
    };
  }

  // ─── Crear organización manual ───
  async createOrganization(
    user: User,
    dto: { name: string; owner_email: string; plan: OrganizationPlan; months?: number; notes?: string },
  ): Promise<Organization> {
    this.assertSuperAdmin(user);

    const owner = await this.userRepo.findOne({ where: { email: dto.owner_email.toLowerCase() } });
    if (!owner) throw new NotFoundException('No se encontró un usuario con ese email');

    // Si ya tiene organización propia, error
    const existing = await this.orgRepo.findOne({ where: { owner_id: owner.id } });
    if (existing) throw new BadRequestException('Este usuario ya tiene una organización');

    const limit = PLAN_LIMITS[dto.plan];
    let expires: Date | null = null;
    if (dto.plan !== 'free' && dto.months) {
      expires = new Date();
      expires.setMonth(expires.getMonth() + dto.months);
    }

    const org = await this.orgRepo.save(
      this.orgRepo.create({
        name: dto.name,
        owner_id: owner.id,
        plan: dto.plan,
        horse_limit: limit.horses,
        status: 'active',
        plan_expires_at: expires,
        notes: dto.notes ?? null,
      }),
    );

    // Owner pasa a ser admin de la organización
    await this.memberRepo.save(
      this.memberRepo.create({
        organization_id: org.id,
        user_id: owner.id,
        role_in_org: 'admin',
      }),
    );

    return org;
  }

  // ─── Cambiar plan de una organización ───
  async setOrganizationPlan(
    user: User,
    orgId: string,
    dto: { plan: OrganizationPlan; months?: number },
  ): Promise<Organization> {
    this.assertSuperAdmin(user);

    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const limit = PLAN_LIMITS[dto.plan];
    let expires: Date | null = null;
    if (dto.plan !== 'free' && dto.months) {
      expires = new Date();
      expires.setMonth(expires.getMonth() + dto.months);
    }

    org.plan = dto.plan;
    org.horse_limit = limit.horses;
    org.plan_expires_at = expires;
    if (org.status === 'suspended') org.status = 'active';
    return this.orgRepo.save(org);
  }

  async setOrganizationStatus(user: User, orgId: string, status: OrganizationStatus): Promise<Organization> {
    this.assertSuperAdmin(user);
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    org.status = status;
    return this.orgRepo.save(org);
  }

  // ─── Matrículas de veterinarios pendientes de validación ───
  async listPendingLicenses(user: User) {
    this.assertSuperAdmin(user);
    const users = await this.userRepo.find({
      where: { vet_license_status: 'pending' },
      select: ['id', 'name', 'email', 'vet_license_number', 'vet_province', 'vet_license_url'],
      order: { name: 'ASC' },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      vet_license_number: u.vet_license_number,
      vet_province: u.vet_province,
      vet_license_url: u.vet_license_url,
    }));
  }

  async setLicenseStatus(user: User, userId: string, status: 'approved' | 'rejected') {
    this.assertSuperAdmin(user);
    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    target.vet_license_status = status;
    await this.userRepo.save(target);
    return { id: target.id, vet_license_status: target.vet_license_status };
  }

  async deleteOrganization(user: User, orgId: string): Promise<void> {
    this.assertSuperAdmin(user);
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    // Liberar caballos (organization_id = null) — el propietario los conserva
    await this.horseRepo.update({ organization_id: orgId }, { organization_id: null });
    // Borrar miembros
    await this.memberRepo.delete({ organization_id: orgId });
    // Borrar organización
    await this.orgRepo.remove(org);
  }
}
