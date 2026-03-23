import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('event_photos')
export class EventPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column('uuid')
  event_id: string;

  @ManyToOne(() => Event, (event) => event.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @CreateDateColumn()
  created_at: Date;
}
