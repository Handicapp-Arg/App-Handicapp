import { Horse } from '../../horses/horse.entity';

type RecipientExtractor = (horse: Horse) => string | null;

const EVENT_CREATED_RESOLVERS: RecipientExtractor[] = [
  (horse) => horse.owner_id,
  (horse) => horse.establishment_id,
];

export function resolveRecipients(
  horse: Horse,
  actorId: string,
  resolvers: RecipientExtractor[] = EVENT_CREATED_RESOLVERS,
): string[] {
  const ids = new Set<string>();

  for (const resolve of resolvers) {
    const id = resolve(horse);
    if (id && id !== actorId) {
      ids.add(id);
    }
  }

  return [...ids];
}
