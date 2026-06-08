'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { HorseRecord, HorseRecordNode, HorseOwnershipClaim } from '@/types';

interface SearchParams {
  name?: string;
  birth_year?: number;
  country_code?: string;
  breed?: string;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  items: HorseRecord[];
  total: number;
}

interface SubmitClaimPayload {
  horse_record_id: string;
  registration_number?: string;
  microchip?: string;
  claimed_birth_date?: string;
  document_url?: string;
  document_public_id?: string;
}

export function useHorseRecordsSearch(params: SearchParams, enabled = true) {
  return useQuery<SearchResult>({
    queryKey: ['horse-records', 'search', params],
    queryFn: () => api.get('/horse-records/search', { params }).then(r => r.data),
    enabled: enabled && (!!params.name || params.limit !== undefined),
    staleTime: 30_000,
  });
}

export function useHorseRecord(id: string | null) {
  return useQuery<HorseRecord>({
    queryKey: ['horse-records', id],
    queryFn: () => api.get(`/horse-records/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useHorseRecordTree(id: string | null, depth = 4) {
  return useQuery<HorseRecordNode>({
    queryKey: ['horse-records', id, 'tree', depth],
    queryFn: () => api.get(`/horse-records/${id}/tree`, { params: { depth } }).then(r => r.data),
    enabled: !!id,
    staleTime: 120_000,
  });
}

export function useHorseRecordProgeny(id: string | null) {
  return useQuery<HorseRecord[]>({
    queryKey: ['horse-records', id, 'progeny'],
    queryFn: () => api.get(`/horse-records/${id}/progeny`).then(r => r.data),
    enabled: !!id,
    staleTime: 120_000,
  });
}

export function useMyHorseRecordClaims() {
  return useQuery<HorseOwnershipClaim[]>({
    queryKey: ['horse-records', 'claims', 'mine'],
    queryFn: () => api.get('/horse-records/claims/mine').then(r => r.data),
    staleTime: 30_000,
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation<HorseOwnershipClaim, Error, SubmitClaimPayload>({
    mutationFn: (payload) => api.post('/horse-records/claims', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horse-records', 'claims', 'mine'] });
      qc.invalidateQueries({ queryKey: ['horse-records'] });
    },
  });
}

export function useUploadClaimDocument() {
  return useMutation<{ url: string; public_id: string }, Error, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/horse-records/claims/upload-document', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
  });
}

// ─── Import jobs ─────────────────────────────────────────────────────────────

export interface ImportJob {
  jobId: string;
  source: string;
  status: 'running' | 'done' | 'error';
  startedAt: string;
  finishedAt?: string;
  processed: number;
  imported: number;
  updated: number;
  errors: number;
  currentPage?: number;
  message?: string;
}

export function useImportJobs() {
  return useQuery<ImportJob[]>({
    queryKey: ['horse-records', 'import-jobs'],
    queryFn: () => api.get('/horse-records/admin/import-jobs').then(r => r.data),
    refetchInterval: (query) => {
      const jobs: ImportJob[] = query.state.data ?? [];
      return jobs.some(j => j.status === 'running') ? 3000 : 15_000;
    },
  });
}

export function useImportJob(jobId: string | null) {
  return useQuery<ImportJob>({
    queryKey: ['horse-records', 'import-jobs', jobId],
    queryFn: () => api.get(`/horse-records/admin/import-jobs/${jobId}`).then(r => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job: ImportJob | undefined = query.state.data;
      return job?.status === 'running' ? 2000 : false;
    },
  });
}

export function useAdminImportStudbookAR() {
  const qc = useQueryClient();
  return useMutation<{ jobId: string }, Error, void>({
    mutationFn: () => api.post('/horse-records/admin/import-studbook-ar').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horse-records', 'import-jobs'] }),
  });
}

export function useAdminImportWikidata() {
  const qc = useQueryClient();
  return useMutation<{ jobId: string }, Error, { minYear?: number; maxYear?: number }>({
    mutationFn: (payload) => api.post('/horse-records/admin/import-wikidata', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horse-records', 'import-jobs'] }),
  });
}

export function useAdminRetryFailed() {
  const qc = useQueryClient();
  return useMutation<{ reset: number }, Error, void>({
    mutationFn: () => api.post('/horse-records/admin/retry-failed').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['horse-records', 'stats'] }),
  });
}

export interface FraudSignal {
  key: string;
  weight: number;
  detail: string;
}

export interface AuditClaim extends HorseOwnershipClaim {
  fraud_signals: FraudSignal[] | null;
  fraud_risk: 'none' | 'low' | 'medium' | 'high';
  needs_audit: boolean;
}

// Admin hooks
export function useHorseRecordStats() {
  return useQuery({
    queryKey: ['horse-records', 'stats'],
    queryFn: () => api.get('/horse-records/stats').then(r => r.data),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function usePendingClaims(limit = 50, offset = 0) {
  return useQuery<{ items: HorseOwnershipClaim[]; total: number }>({
    queryKey: ['horse-records', 'claims', 'pending', limit, offset],
    queryFn: () => api.get('/horse-records/claims/pending', { params: { limit, offset } }).then(r => r.data),
    staleTime: 15_000,
  });
}

export function useApproveClaim() {
  const qc = useQueryClient();
  return useMutation<HorseOwnershipClaim, Error, string>({
    mutationFn: (claimId) => api.post(`/horse-records/claims/${claimId}/approve`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horse-records', 'claims'] });
      qc.invalidateQueries({ queryKey: ['horse-records', 'stats'] });
    },
  });
}

export function useRejectClaim() {
  const qc = useQueryClient();
  return useMutation<HorseOwnershipClaim, Error, { claimId: string; reason: string }>({
    mutationFn: ({ claimId, reason }) =>
      api.post(`/horse-records/claims/${claimId}/reject`, { reason }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horse-records', 'claims'] });
      qc.invalidateQueries({ queryKey: ['horse-records', 'stats'] });
    },
  });
}

export function useAuditQueue(limit = 50, offset = 0) {
  return useQuery<{ items: AuditClaim[]; total: number }>({
    queryKey: ['horse-records', 'claims', 'audit', limit, offset],
    queryFn: () => api.get('/horse-records/claims/audit', { params: { limit, offset } }).then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useRevokeClaim() {
  const qc = useQueryClient();
  return useMutation<HorseOwnershipClaim, Error, { claimId: string; reason: string }>({
    mutationFn: ({ claimId, reason }) =>
      api.post(`/horse-records/claims/${claimId}/revoke`, { reason }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horse-records', 'claims'] });
      qc.invalidateQueries({ queryKey: ['horse-records', 'stats'] });
    },
  });
}
