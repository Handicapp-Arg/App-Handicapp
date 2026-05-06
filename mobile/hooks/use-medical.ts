import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface MedicalRecord {
  id: string;
  horse_id: string;
  type: 'vacuna' | 'desparasitacion' | 'analisis' | 'tratamiento';
  name: string;
  date: string;
  next_due: string | null;
  brand: string | null;
  batch: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorder?: { id: string; name: string; role: string } | null;
}

export interface CreateMedicalRecordDto {
  type: MedicalRecord['type'];
  name: string;
  date: string;
  next_due?: string;
  brand?: string;
  notes?: string;
}

export const MEDICAL_TYPE_LABELS: Record<string, string> = {
  vacuna: 'Vacuna',
  desparasitacion: 'Desparasitación',
  analisis: 'Análisis',
  tratamiento: 'Tratamiento',
};

export const MEDICAL_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  vacuna:        { bg: '#f0fdf4', text: '#15803d' },
  desparasitacion: { bg: '#fff7ed', text: '#c2410c' },
  analisis:      { bg: '#eff6ff', text: '#1d4ed8' },
  tratamiento:   { bg: '#fef2f2', text: '#b91c1c' },
};

export function useMedicalRecords(horseId: string) {
  return useQuery<MedicalRecord[]>({
    queryKey: ['medical', horseId],
    queryFn: async () => (await api.get(`/horses/${horseId}/medical`)).data,
    enabled: !!horseId,
  });
}

export function useAddMedicalRecord(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMedicalRecordDto) =>
      (await api.post(`/horses/${horseId}/medical`, dto)).data as MedicalRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical', horseId] }),
  });
}

export function useDeleteMedicalRecord(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/horses/${horseId}/medical/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical', horseId] }),
  });
}
