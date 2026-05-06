import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Bill {
  id: string;
  horse?: { id: string; name: string };
  month: number;
  year: number;
  items: BillItem[];
  total: number;
  status: 'borrador' | 'enviada' | 'aprobada' | 'disputada';
  dispute_reason: string | null;
  notes: string | null;
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  borrador:  { label: 'Borrador',  color: '#374151', bg: '#f3f4f6' },
  enviada:   { label: 'Enviada',   color: '#1d4ed8', bg: '#eff6ff' },
  aprobada:  { label: 'Aprobada',  color: '#15803d', bg: '#f0fdf4' },
  disputada: { label: 'Disputada', color: '#b91c1c', bg: '#fef2f2' },
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const monthLabel = (m: number, y: number) => `${MONTHS[m - 1]} ${y}`;

export function useBills() {
  return useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: async () => (await api.get('/billing')).data,
  });
}

export function useSendBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/billing/${id}/send`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  });
}

export function useApproveBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/billing/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  });
}

export function useDisputeBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/billing/${id}/dispute`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  });
}
