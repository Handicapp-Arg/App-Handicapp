import type { UserSummary } from './user';

export interface HorseOwnership {
  id: string;
  user_id: string;
  percentage: number | null;
  user?: UserSummary;
}

export interface HorseRef {
  id: string;
  name: string;
  image_url: string | null;
}
