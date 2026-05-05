import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Event } from '../events/event.entity';

export enum NotificationType {
  EVENT_CREATED = 'event_created',
  HEALTH_REMINDER = 'health_reminder',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column('text')
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column('uuid')
  recipient_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column('uuid', { nullable: true })
  event_id: string | null;

  @ManyToOne(() => Event, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column('uuid', { nullable: true })
  actor_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @CreateDateColumn()
  created_at: Date;
}
