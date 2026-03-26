import { EventType } from './event.entity';

export interface EventTypeMeta {
  value: EventType;
  label: string;
}

export const EVENT_TYPES: EventTypeMeta[] = [
  { value: EventType.SALUD, label: 'Salud' },
  { value: EventType.ENTRENAMIENTO, label: 'Entrenamiento' },
  { value: EventType.GASTO, label: 'Gasto' },
  { value: EventType.NOTA, label: 'Nota' },
];

export const EVENT_TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((t) => [t.value, t.label]),
);
