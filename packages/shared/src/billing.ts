import type { EventCurrency } from './event';

export type BillStatus = 'borrador' | 'enviada' | 'aprobada' | 'disputada';

export interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Bill {
  id: string;
  horse_id: string;
  establishment_id: string;
  owner_id: string;
  month: number;
  year: number;
  items: BillItem[];
  total: number;
  currency: EventCurrency;
  status: BillStatus;
  dispute_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
