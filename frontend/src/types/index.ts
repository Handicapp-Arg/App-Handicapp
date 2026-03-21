export enum UserRole {
  ADMIN = 'admin',
  PROPIETARIO = 'propietario',
  ESTABLECIMIENTO = 'establecimiento',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Horse {
  id: string;
  name: string;
  birth_date: string | null;
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

export interface Event {
  id: string;
  type: EventType;
  description: string;
  date: string;
  horse_id: string;
  horse?: Horse;
  created_at: string;
}
