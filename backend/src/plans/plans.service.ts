import {
  Injectable, ForbiddenException, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Organization, OrganizationPlan } from '../organizations/organization.entity';
import { Plan, PlanFeature, PlanRoleTarget } from './plan.entity';

// Fallback hardcodeado (por si la tabla `plans` todavía no está sembrada).
export const PLAN_LIMITS: Record<OrganizationPlan, { horses: number | null; label: string }> = {
  free:       { horses: 3,    label: 'Gratis' },
  basic:      { horses: 25,   label: 'Stable Basic' },
  pro:        { horses: 80,   label: 'Stable Pro' },
  enterprise: { horses: null, label: 'Enterprise' },
};

export const INDIVIDUAL_PLAN_LIMITS = {
  free: { horses: 3, label: 'Gratis' },
  pro:  { horses: null, label: 'Pro' },
};

// Seed de los 12 planes (valores tentativos; el super admin puede editarlos).
const PLAN_SEED: Array<Partial<Plan>> = [
  // Propietario (3)
  { role_target: 'propietario', tier_key: 'free',    name: 'Gratis',   tier: 0, price_ars: 0,      horse_limit: 3,    staff_limit: null, features: [] },
  { role_target: 'propietario', tier_key: 'pro',     name: 'Pro',      tier: 1, price_ars: 0,      horse_limit: 15,   staff_limit: null, features: ['whatsapp'] },
  { role_target: 'propietario', tier_key: 'premium', name: 'Premium',  tier: 2, price_ars: 0,      horse_limit: null, staff_limit: null, features: ['whatsapp', 'reportes'] },
  // Veterinario (2)
  { role_target: 'veterinario', tier_key: 'free',    name: 'Gratis',   tier: 0, price_ars: 0,      horse_limit: 10,   staff_limit: null, features: [] },
  { role_target: 'veterinario', tier_key: 'pro',     name: 'Pro',      tier: 1, price_ars: 0,      horse_limit: null, staff_limit: null, features: ['whatsapp', 'libreta_digital'] },
  // Establecimiento (4)
  { role_target: 'establecimiento', tier_key: 'free',       name: 'Gratis',       tier: 0, price_ars: 0,      horse_limit: 3,    staff_limit: 2,    features: [] },
  { role_target: 'establecimiento', tier_key: 'basic',      name: 'Stable Basic', tier: 1, price_ars: 25000,  horse_limit: 25,   staff_limit: 5,    features: [] },
  { role_target: 'establecimiento', tier_key: 'pro',        name: 'Stable Pro',   tier: 2, price_ars: 60000,  horse_limit: 80,   staff_limit: 15,   features: ['whatsapp'] },
  { role_target: 'establecimiento', tier_key: 'enterprise', name: 'Enterprise',   tier: 3, price_ars: 150000, horse_limit: null, staff_limit: null, features: ['whatsapp', 'reportes'] },
  // Haras (3) — el módulo reproductivo es Fase 4
  { role_target: 'haras', tier_key: 'basic',      name: 'Haras Basic',      tier: 1, price_ars: 0, horse_limit: 40,   staff_limit: 8,    features: ['reproductivo'] },
  { role_target: 'haras', tier_key: 'pro',        name: 'Haras Pro',        tier: 2, price_ars: 0, horse_limit: 120,  staff_limit: 20,   features: ['reproductivo', 'whatsapp'] },
  { role_target: 'haras', tier_key: 'enterprise', name: 'Haras Enterprise', tier: 3, price_ars: 0, horse_limit: null, staff_limit: null, features: ['reproductivo', 'whatsapp', 'reportes'] },
];

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  // Seed idempotente: inserta los planes que falten (no pisa ajustes del admin).
  private async seed(): Promise<void> {
    for (const p of PLAN_SEED) {
      const exists = await this.planRepo.findOne({
        where: { role_target: p.role_target, tier_key: p.tier_key },
      });
      if (!exists) await this.planRepo.save(this.planRepo.create(p));
    }
  }

  // ─── Resolución de plan (fuente de verdad = tabla) ───

  /** Tier efectivo de un usuario, degradando a 'free' si venció. */
  private effectiveTier(plan: string | null | undefined, expiresAt: Date | null | undefined): string {
    const p = plan || 'free';
    const expired = p !== 'free' && expiresAt && expiresAt < new Date();
    return expired ? 'free' : p;
  }

  /** Plan (de la tabla) de un usuario individual (propietario/veterinario). null si su rol no tiene plan. */
  async getPlanForUser(user: User): Promise<Plan | null> {
    const roleTarget = (['propietario', 'veterinario'] as string[]).includes(user.role)
      ? (user.role as PlanRoleTarget)
      : null;
    if (!roleTarget) return null;
    const tierKey = this.effectiveTier(user.plan, user.plan_expires_at);
    return (
      (await this.planRepo.findOne({ where: { role_target: roleTarget, tier_key: tierKey } })) ??
      (await this.planRepo.findOne({ where: { role_target: roleTarget, tier_key: 'free' } }))
    );
  }

  /** Plan (de la tabla) de una organización. Hoy role_target='establecimiento' (haras = Fase 4). */
  async getPlanForOrg(orgId: string): Promise<Plan | null> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) return null;
    const roleTarget: PlanRoleTarget = 'establecimiento';
    const tierKey = this.effectiveTier(org.plan, org.plan_expires_at);
    return (
      (await this.planRepo.findOne({ where: { role_target: roleTarget, tier_key: tierKey } })) ??
      (await this.planRepo.findOne({ where: { role_target: roleTarget, tier_key: 'free' } }))
    );
  }

  /** Gating de features. Pasá user (plan individual) u orgId (plan de org). */
  async hasFeature(feature: PlanFeature, ctx: { user?: User; orgId?: string | null }): Promise<boolean> {
    const plan = ctx.orgId
      ? await this.getPlanForOrg(ctx.orgId)
      : ctx.user
      ? await this.getPlanForUser(ctx.user)
      : null;
    return !!plan?.features?.includes(feature);
  }

  async listPlans(): Promise<Plan[]> {
    return this.planRepo.find({ order: { role_target: 'ASC', tier: 'ASC' } });
  }

  // Edición por el super admin (no cambia role_target ni tier_key).
  async updatePlan(id: string, dto: Partial<Plan>): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    const { role_target, tier_key, id: _ignore, ...editable } = dto as Plan;
    Object.assign(plan, editable);
    return this.planRepo.save(plan);
  }

  // ─── Status (usado por el frontend) ───

  async getPlanStatus(user: User) {
    const tierKey = this.effectiveTier(user.plan, user.plan_expires_at);
    const plan = await this.getPlanForUser(user);
    const horseLimit = plan ? plan.horse_limit : (INDIVIDUAL_PLAN_LIMITS[tierKey === 'pro' ? 'pro' : 'free'].horses);
    const label = plan ? plan.name : (INDIVIDUAL_PLAN_LIMITS[tierKey === 'pro' ? 'pro' : 'free'].label);
    const horseCount = await this.horseRepo.count({
      where: { owner_id: user.id, organization_id: null as any },
    });
    return {
      plan: tierKey,
      plan_expires_at: user.plan_expires_at,
      horse_count: horseCount,
      horse_limit: horseLimit,
      is_limited: horseLimit != null && horseCount >= horseLimit,
      label,
      features: plan?.features ?? [],
      price_ars: plan?.price_ars ?? 0,
    };
  }

  async getOrgPlanStatus(orgId: string) {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const tierKey = this.effectiveTier(org.plan, org.plan_expires_at) as OrganizationPlan;
    const plan = await this.getPlanForOrg(orgId);
    const horseLimit = plan ? plan.horse_limit : PLAN_LIMITS[tierKey].horses;
    const label = plan ? plan.name : PLAN_LIMITS[tierKey].label;
    const horseCount = await this.horseRepo.count({ where: { organization_id: orgId } });

    return {
      plan: tierKey,
      plan_expires_at: org.plan_expires_at,
      horse_count: horseCount,
      horse_limit: horseLimit,
      is_limited: horseLimit != null && horseCount >= horseLimit,
      label,
      features: plan?.features ?? [],
      staff_limit: plan?.staff_limit ?? null,
      price_ars: plan?.price_ars ?? 0,
    };
  }

  async activatePro(userId: string, months = 1): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Usuario no encontrado');
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    user.plan = 'pro';
    user.plan_expires_at = expiry;
    return this.userRepo.save(user);
  }

  async adminSetPlan(userId: string, plan: string, months = 1): Promise<{ id: string; name: string; plan: string; plan_expires_at: Date | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Usuario no encontrado');
    if (plan === 'free') {
      user.plan = 'free';
      user.plan_expires_at = null;
    } else {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + (months ?? 1));
      user.plan = plan;
      user.plan_expires_at = expiry;
    }
    const saved = await this.userRepo.save(user);
    return { id: saved.id, name: saved.name, plan: saved.plan, plan_expires_at: saved.plan_expires_at };
  }

  async getUsersWithPlan(): Promise<Array<{ id: string; name: string; email: string; role: string; plan: string; plan_expires_at: Date | null; horse_count: number }>> {
    const users = await this.userRepo.find({
      where: [{ role: 'propietario' }, { role: 'establecimiento' }],
      order: { name: 'ASC' },
    });
    return Promise.all(users.map(async (u) => {
      const horseCount = await this.horseRepo.count({ where: { owner_id: u.id } });
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: this.effectiveTier(u.plan, u.plan_expires_at),
        plan_expires_at: u.plan_expires_at,
        horse_count: horseCount,
      };
    }));
  }

  async assertOrgActive(orgId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.status === 'suspended') {
      throw new ForbiddenException(
        'Esta organización está suspendida. Contactá al administrador de HandicApp para reactivarla.',
      );
    }
  }

  async assertCanAddHorse(user: User, targetOrgId?: string | null): Promise<void> {
    if (targetOrgId) {
      await this.assertOrgActive(targetOrgId);
      const status = await this.getOrgPlanStatus(targetOrgId);
      if (status.is_limited) {
        throw new ForbiddenException(
          `El plan ${status.label} de esta organización permite hasta ${status.horse_limit} caballos. Contactá al admin para actualizar.`,
        );
      }
      return;
    }
    const status = await this.getPlanStatus(user);
    if (status.is_limited) {
      throw new ForbiddenException(
        `Tu plan ${status.label} permite hasta ${status.horse_limit} caballos personales. Sumá tu caballo a una organización o actualizá tu plan.`,
      );
    }
  }
}
