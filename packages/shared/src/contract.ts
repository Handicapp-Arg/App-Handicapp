export type ContractStatus = 'pending' | 'signed' | 'rejected';

export interface Contract {
  id: string;
  establishment_id: string;
  owner_id: string;
  horse_id: string | null;
  title: string;
  body: string;
  status: ContractStatus;
  signed_name: string | null;
  signed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}
