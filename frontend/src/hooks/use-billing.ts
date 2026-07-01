import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { getErrorMessage } from '@/lib/errors';

export interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Bill {
  id: string;
  horse_id: string;
  horse?: { id: string; name: string };
  establishment_id: string;
  owner_id: string;
  month: number;
  year: number;
  items: BillItem[];
  total: number;
  status: 'borrador' | 'enviada' | 'aprobada' | 'disputada';
  dispute_reason: string | null;
  notes: string | null;
  created_at: string;
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  borrador:  { label: 'Borrador',  color: 'text-gray-600',   bg: 'bg-gray-100' },
  enviada:   { label: 'Enviada',   color: 'text-blue-700',   bg: 'bg-blue-50' },
  aprobada:  { label: 'Aprobada',  color: 'text-emerald-700',bg: 'bg-emerald-50' },
  disputada: { label: 'Disputada', color: 'text-red-700',    bg: 'bg-red-50' },
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export function monthLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function useBills() {
  return useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: async () => (await api.get('/billing')).data,
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (dto: { horse_id: string; owner_id: string; month: number; year: number; items: Omit<BillItem, 'total'>[]; notes?: string; currency?: 'ARS' | 'USD' }) => {
      const { data } = await api.post('/billing', dto);
      return data as Bill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Factura creada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSendBill() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/billing/${id}/send`);
      return data as Bill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Factura enviada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useApproveBill() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/billing/${id}/approve`);
      return data as Bill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Factura aprobada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDisputeBill() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.patch(`/billing/${id}/dispute`, { reason });
      return data as Bill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Factura disputada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/billing/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Factura eliminada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
