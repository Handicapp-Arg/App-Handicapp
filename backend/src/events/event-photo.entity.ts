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

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  public_id: string;

  @Column({ type: 'varchar', default: 'image' })
  file_type: 'image' | 'pdf';

  @Column('uuid')
  event_id: string;

  @ManyToOne(() => Event, (event) => event.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @CreateDateColumn()
  created_at: Date;
}
