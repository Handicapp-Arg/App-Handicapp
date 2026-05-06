import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

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
  batch?: string;
  notes?: string;
}

export function useMedicalRecords(horseId: string) {
  return useQuery<MedicalRecord[]>({
    queryKey: ['medical', horseId],
    queryFn: async () => {
      const { data } = await api.get(`/horses/${horseId}/medical`);
      return data;
    },
    enabled: !!horseId,
  });
}

export function useAddMedicalRecord(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMedicalRecordDto) => {
      const { data } = await api.post(`/horses/${horseId}/medical`, dto);
      return data as MedicalRecord;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical', horseId] }),
  });
}

export function useDeleteMedicalRecord(horseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/horses/${horseId}/medical/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medical', horseId] }),
  });
}
