export type OrganizationPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'trial';
export type OrgMemberRole = 'admin' | 'staff' | 'owner_role' | 'vet';

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  horse_limit: number | null;
  plan_expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_in_org: OrgMemberRole;
  joined_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_color?: string | null;
  };
}

export interface OrganizationDetail extends Organization {
  members: OrganizationMember[];
  horse_count: number;
}
