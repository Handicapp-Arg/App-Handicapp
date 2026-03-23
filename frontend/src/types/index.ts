export interface Role {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  created_at: string;
}

export interface Horse {
  id: string;
  name: string;
  birth_date: string | null;
  image_url: string | null;
  owner_id: string;
  establishment_id: string | null;
  owner?: User;
  establishment?: User;
  events?: Event[];
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
  filename: string;
  event_id: string;
  created_at: string;
}

export interface Event {
  id: string;
  type: EventType;
  description: string;
  date: string;
  horse_id: string;
  horse?: Horse;
  photos?: EventPhoto[];
  created_at: string;
}
