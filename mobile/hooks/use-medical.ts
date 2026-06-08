import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api, { getToken } from '../lib/api';

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

export function useDownloadMedicalPdf(horseId: string, horseName: string) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '');
      const token = await getToken();
      const url = `${baseUrl}/horses/${horseId}/medical/pdf`;
      const safeName = horseName.replace(/[^a-zA-Z0-9]/g, '_');
      const localUri = `${FileSystem.cacheDirectory}historial-medico-${safeName}.pdf`;

      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (result.status === 200) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        throw new Error(`PDF download failed with status ${result.status}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return { download, loading };
}
