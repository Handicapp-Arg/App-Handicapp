import type { OrganizationPlan } from './organization';

export interface PlanLimits {
  horses: number | null; // null = ilimitado
  members: number | null;
}

export const PLAN_LIMITS: Record<OrganizationPlan, PlanLimits> = {
  free: { horses: 3, members: 2 },
  basic: { horses: 15, members: 5 },
  pro: { horses: 50, members: 15 },
  enterprise: { horses: null, members: null },
};

export interface PlanStatus {
  plan: OrganizationPlan;
  plan_expires_at: string | null;
  horses_used: number;
  horses_limit: number | null;
  members_used: number;
  members_limit: number | null;
}
