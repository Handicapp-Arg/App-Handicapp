export type UserRole = 'admin' | 'propietario' | 'establecimiento' | 'veterinario';

export type UserPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
  plan: UserPlan;
  plan_expires_at: string | null;
  permissions: string[];
}
