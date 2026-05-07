import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Organization, OrganizationPlan } from '../organizations/organization.entity';

// Límites por plan de organización
export const PLAN_LIMITS: Record<OrganizationPlan, { horses: number | null; label: string }> = {
  free:       { horses: 3,    label: 'Gratis' },
  basic:      { horses: 25,   label: 'Stable Basic' },
  pro:        { horses: 80,   label: 'Stable Pro' },
  enterprise: { horses: null, label: 'Enterprise' },
};

// Plan individual del propietario sin organización (caballos personales)
export const INDIVIDUAL_PLAN_LIMITS = {
  free: { horses: 3, label: 'Gratis' },
  pro:  { horses: null, label: 'Pro' },
};

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Horse)
    private readonly horseRepo: Repository<Horse>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Status del plan individual del usuario (caballos personales sin organización).
   * Aplica a propietarios que tienen sus propios caballos sin estar en una organización.
   */
  async getPlanStatus(user: User) {
    const userPlan = (user.plan === 'pro') ? 'pro' : 'free';
    const limit = INDIVIDUAL_PLAN_LIMITS[userPlan];
    // Caballos personales = caballos donde es owner Y no tienen organización
    const horseCount = await this.horseRepo.count({
      where: { owner_id: user.id, organization_id: null as any },
    });
    const isExpired = user.plan !== 'free' && user.plan_expires_at && user.plan_expires_at < new Date();
    const finalPlan = isExpired ? 'free' : userPlan;
    const finalLimit = INDIVIDUAL_PLAN_LIMITS[finalPlan];
    return {
      plan: finalPlan,
      plan_expires_at: user.plan_expires_at,
      horse_count: horseCount,
      horse_limit: finalLimit.horses,
      is_limited: finalLimit.horses != null && horseCount >= finalLimit.horses,
      label: finalLimit.label,
    };
  }

  /**
   * Status del plan de una organización.
   */
  async getOrgPlanStatus(orgId: string) {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const limit = PLAN_LIMITS[org.plan];
    const horseCount = await this.horseRepo.count({ where: { organization_id: orgId } });
    const isExpired = org.plan !== 'free' && org.plan_expires_at && org.plan_expires_at < new Date();
    const finalPlan = isExpired ? 'free' : org.plan;
    const finalLimit = PLAN_LIMITS[finalPlan];

    return {
      plan: finalPlan,
      plan_expires_at: org.plan_expires_at,
      horse_count: horseCount,
      horse_limit: finalLimit.horses,
      is_limited: finalLimit.horses != null && horseCount >= finalLimit.horses,
      label: finalLimit.label,
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
    if (plan === 'pro') {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + (months ?? 1));
      user.plan = 'pro';
      user.plan_expires_at = expiry;
    } else {
      user.plan = 'free';
      user.plan_expires_at = null;
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
      const isExpired = u.plan !== 'free' && u.plan_expires_at && u.plan_expires_at < new Date();
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: isExpired ? 'free' : u.plan,
        plan_expires_at: u.plan_expires_at,
        horse_count: horseCount,
      };
    }));
  }

  /**
   * Verifica si se puede agregar un caballo nuevo.
   * - Si target_org_id está presente: chequea el plan de la organización
   * - Si no: chequea el plan individual del usuario
   */
  async assertCanAddHorse(user: User, targetOrgId?: string | null): Promise<void> {
    if (targetOrgId) {
      const status = await this.getOrgPlanStatus(targetOrgId);
      if (status.is_limited) {
        throw new ForbiddenException(
          `El plan ${status.label} de esta organización permite hasta ${status.horse_limit} caballos. Contactá al admin para actualizar.`,
        );
      }
      return;
    }

    // Plan individual del propietario
    const status = await this.getPlanStatus(user);
    if (status.is_limited) {
      throw new ForbiddenException(
        `Tu plan ${status.label} permite hasta ${status.horse_limit} caballos personales. Sumá tu caballo a una organización o actualizá tu plan.`,
      );
    }
  }
}
