import type { OrgMemberRole } from './organization';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role_in_org: OrgMemberRole;
  token: string;
  status: InvitationStatus;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitationPreview {
  organization: { id: string; name: string };
  inviter: { name: string };
  role_in_org: OrgMemberRole;
  email: string;
  expires_at: string;
}
