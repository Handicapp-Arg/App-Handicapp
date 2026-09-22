import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api, { getToken } from '../lib/api';

export interface MedicalRecord {
  id: string;
  horse_id: string;
  type: 'vacuna' | 'desparasitacion' | 'analisis' | 'tratamiento' | 'sanidad';
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
  sanidad: 'Sanidad',
};

// Colores por tipo desde el theme (funcionan en claro y oscuro), no hex fijos.
export const makeMedicalTypeColors = (c: {
  successSoft: string; success: string; warningSoft: string; warning: string;
  infoSoft: string; info: string; dangerSoft: string; danger: string;
  surfaceAlt: string; textMuted: string;
}): Record<string, { bg: string; text: string }> => ({
  vacuna:          { bg: c.successSoft, text: c.success },
  desparasitacion: { bg: c.warningSoft, text: c.warning },
  analisis:        { bg: c.infoSoft,    text: c.info },
  tratamiento:     { bg: c.dangerSoft,  text: c.danger },
  sanidad:         { bg: c.surfaceAlt,  text: c.textMuted },
});

/**
 * Libreta sanitaria: enfermedades oficiales SENASA con su vigencia (días).
 *
 * OJO: esta lista está espejada en `backend/src/medical/medical.service.ts`
 * (`SANITARY_DISEASES`). Si acá y allá no coinciden clave, vigencia y regex,
 * el semáforo del listado (que lo calcula el backend) y el de la libreta (que
 * lo calcula el cliente) muestran cosas distintas para el mismo caballo.
 */
export const SANITARY_DISEASES: { key: string; name: string; validityDays: number; match: RegExp }[] = [
  { key: 'aie',              name: 'AIE',              validityDays: 60,  match: /aie|anemia|coggins/i },
  { key: 'encefalomielitis', name: 'Encefalomielitis', validityDays: 365, match: /encefalo/i },
  { key: 'influenza',        name: 'Influenza',        validityDays: 90,  match: /influenza|gripe/i },
  { key: 'tetanos',          name: 'Tétanos',          validityDays: 365, match: /t[eé]tano|toxoide/i },
  { key: 'desparasitacion',  name: 'Desparasitación',  validityDays: 180, match: /desparasit|antiparasit|ivermectina|vermífug|vermifug/i },
];

export type HealthStatus = 'verde' | 'amarillo' | 'rojo';

/**
 * Semáforo sanitario. ESPEJO de `backend/src/medical/health-status.ts`: si se
 * cambia uno, se cambia el otro, o la lista de caballos y la libreta van a
 * decir cosas distintas del mismo caballo.
 *
 * Acepta la fecha pelada (`2026-09-15`) o ISO completa (`2026-09-15T00:00:00.000Z`).
 * La versión anterior le pegaba `T00:00:00` encima: con una fecha ISO quedaba
 * inválida y caía en VERDE. En el backend eso ya pasó en producción, con
 * caballos vencidos hace meses figurando como sanos.
 *
 * Ante una fecha ilegible falla hacia el lado SEGURO: dice rojo.
 */
export function healthStatusFromNextDue(nextDue: string | null | undefined): HealthStatus {
  if (!nextDue) return 'rojo';
  const due = new Date(`${String(nextDue).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return 'rojo';
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'rojo';
  if (diffDays <= 15) return 'amarillo';
  return 'verde';
}

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

export function useDownloadHealthCertificate(horseId: string, horseName: string) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '');
      const token = await getToken();
      const url = `${baseUrl}/horses/${horseId}/medical/health-certificate`;
      const safeName = horseName.replace(/[^a-zA-Z0-9]/g, '_');
      const localUri = `${FileSystem.cacheDirectory}certificado-sanitario-${safeName}.pdf`;

      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (result.status === 200) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        throw new Error(`Certificate download failed with status ${result.status}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return { download, loading };
}
