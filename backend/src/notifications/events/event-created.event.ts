import { Event } from '../../events/event.entity';
import { User } from '../../auth/user.entity';
import { Horse } from '../../horses/horse.entity';

export class EventCreatedEvent {
  constructor(
    public readonly event: Event,
    public readonly horse: Horse,
    public readonly creator: User,
  ) {}
}
