export type BoardingRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface BoardingRequest {
  id: string;
  horse_id: string;
  establishment_id: string;
  requester_id: string;
  status: BoardingRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}
