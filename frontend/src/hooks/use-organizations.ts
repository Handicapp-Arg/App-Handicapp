'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type OrgPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type OrgRole = 'admin' | 'staff' | 'owner_role' | 'vet' | 'encargado' | 'jinete' | 'peon';

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_in_org: OrgRole;
  joined_at: string;
  user: { id: string; name: string; email: string; role: string; avatar_color?: string | null; avatar_url?: string | null };
}

export interface OrgInvitation {
  id: string;
  email: string;
  role_in_org: OrgRole;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface OrgJoinRequest {
  id: string;
  organization_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  requester: { id: string; name: string; email: string; role: string };
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  plan: OrgPlan;
  horse_limit: number | null;
  status: 'active' | 'suspended' | 'trial';
  plan_expires_at: string | null;
  members: OrgMember[];
  horse_count: number;
  join_code: string | null;
  created_at: string;
}

export function useMyOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ['organizations', 'mine'],
    queryFn: async () => (await api.get('/organizations/mine')).data,
  });
}

export function useOrganization(id: string | null) {
  return useQuery<Organization>({
    queryKey: ['organizations', id],
    queryFn: async () => (await api.get(`/organizations/${id}`)).data,
    enabled: !!id,
  });
}

export function useOrgInvitations(orgId: string | null) {
  return useQuery<OrgInvitation[]>({
    queryKey: ['organizations', orgId, 'invitations'],
    queryFn: async () => (await api.get(`/organizations/${orgId}/invitations`)).data,
    enabled: !!orgId,
  });
}

export function useCreateInvitation(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { email: string; role_in_org: OrgRole }) =>
      (await api.post(`/organizations/${orgId}/invitations`, dto)).data as OrgInvitation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations', orgId, 'invitations'] }),
  });
}

/** Optimistic: la invitación desaparece de la lista al instante. Rollback si la API falla. */
export function useCancelInvitation(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invId: string) => {
      await api.delete(`/organizations/${orgId}/invitations/${invId}`);
    },
    onMutate: async (invId) => {
      const key = ['organizations', orgId, 'invitations'];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<OrgInvitation[]>(key);
      if (previous) {
        qc.setQueryData<OrgInvitation[]>(key, previous.filter((i) => i.id !== invId));
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['organizations', orgId, 'invitations'], ctx.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['organizations', orgId, 'invitations'] }),
  });
}

/** Optimistic: el miembro desaparece del detalle de org al instante. */
export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/organizations/${orgId}/members/${memberId}`);
    },
    onMutate: async (memberId) => {
      const key = ['organizations', orgId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Organization>(key);
      if (previous) {
        qc.setQueryData<Organization>(key, {
          ...previous,
          members: previous.members.filter((m) => m.id !== memberId),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['organizations', orgId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['organizations', orgId] }),
  });
}

/** Optimistic: el rol cambia visualmente al instante en el detalle. */
export function useChangeMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role_in_org }: { memberId: string; role_in_org: OrgRole }) =>
      (await api.patch(`/organizations/${orgId}/members/${memberId}/role`, { role_in_org })).data as OrgMember,
    onMutate: async ({ memberId, role_in_org }) => {
      const key = ['organizations', orgId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Organization>(key);
      if (previous) {
        qc.setQueryData<Organization>(key, {
          ...previous,
          members: previous.members.map((m) =>
            m.id === memberId ? { ...m, role_in_org } : m,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['organizations', orgId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['organizations', orgId] }),
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => (await api.post(`/invitations/${token}/accept`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['horses'] });
    },
  });
}

export function useInvitationByToken(token: string | null) {
  return useQuery<{ organization: { id: string; name: string }; inviter: { name: string }; role_in_org: OrgRole; email: string; expires_at: string }>({
    queryKey: ['invitations', token],
    queryFn: async () => (await api.get(`/invitations/${token}`)).data,
    enabled: !!token,
    retry: false,
  });
}

export function useJoinRequests(orgId: string | null) {
  return useQuery<OrgJoinRequest[]>({
    queryKey: ['organizations', orgId, 'join-requests'],
    queryFn: async () => (await api.get(`/organizations/${orgId}/join-requests`)).data,
    enabled: !!orgId,
  });
}

/** Optimistic: la solicitud desaparece de la lista al instante. Rollback si la API falla. */
export function useApproveJoinRequest(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, role_in_org }: { requestId: string; role_in_org: OrgRole }) =>
      (await api.patch(`/organizations/join-requests/${requestId}/approve`, { role_in_org })).data,
    onMutate: async ({ requestId }) => {
      const key = ['organizations', orgId, 'join-requests'];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<OrgJoinRequest[]>(key);
      if (previous) {
        qc.setQueryData<OrgJoinRequest[]>(key, previous.filter((r) => r.id !== requestId));
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['organizations', orgId, 'join-requests'], ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['organizations', orgId, 'join-requests'] });
      qc.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}

/** Optimistic: la solicitud desaparece de la lista al instante. */
export function useRejectJoinRequest(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      await api.patch(`/organizations/join-requests/${requestId}/reject`);
    },
    onMutate: async (requestId) => {
      const key = ['organizations', orgId, 'join-requests'];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<OrgJoinRequest[]>(key);
      if (previous) {
        qc.setQueryData<OrgJoinRequest[]>(key, previous.filter((r) => r.id !== requestId));
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['organizations', orgId, 'join-requests'], ctx.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['organizations', orgId, 'join-requests'] }),
  });
}

export function useRequestJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { join_code: string; message?: string }) =>
      (await api.post('/organizations/join-requests', dto)).data as OrgJoinRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Administrador',
  staff: 'Staff',
  owner_role: 'Propietario',
  vet: 'Veterinario',
  encargado: 'Encargado',
  jinete: 'Jinete',
  peon: 'Peón',
};

/**
 * Nombres comerciales canónicos de los planes. Fuente de verdad única de los
 * labels de plan en toda la app (web y móvil). No usar "Free"/"Ent."/mezclas:
 * el cupo ("3 caballos") va como sufijo aparte, nunca como otro label.
 */
export const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis',
  basic: 'Stable Basic',
  pro: 'Stable Pro',
  premium: 'Premium',
  enterprise: 'Enterprise',
};
