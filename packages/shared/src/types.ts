export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  created_at: string;
}

export interface CatalogItem {
  id: string;
  type: string;
  name: string;
  created_at: string;
}

export interface HorseOwnership {
  id: string;
  user_id: string;
  percentage: number | null;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Horse {
  id: string;
  name: string;
  birth_date: string | null;
  image_url: string | null;
  owner_id: string;
  establishment_id: string | null;
  microchip: string | null;
  breed_id: string | null;
  activity_id: string | null;
  owner?: User;
  establishment?: User;
  breed?: CatalogItem;
  activity?: CatalogItem;
  co_owners?: HorseOwnership[];
  created_at: string;
}

export enum EventType {
  SALUD = 'salud',
  ENTRENAMIENTO = 'entrenamiento',
  GASTO = 'gasto',
  NOTA = 'nota',
}

export interface EventPhoto {
  id: string;
  url: string;
  public_id: string;
  file_type: 'image' | 'pdf';
  event_id: string;
  created_at: string;
}

export interface Event {
  id: string;
  type: EventType;
  description: string;
  amount: number | null;
  date: string;
  horse_id: string;
  horse?: Horse;
  photos?: EventPhoto[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  recipient_id: string;
  event_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface FinancialSummary {
  total: number;
  average_monthly: number;
  by_type: { type: string; total: number }[];
  monthly: { month: string; total: number }[];
}
