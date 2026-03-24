import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { EventPhoto } from './event-photo.entity';

export enum EventType {
  SALUD = 'salud',
  ENTRENAMIENTO = 'entrenamiento',
  GASTO = 'gasto',
  NOTA = 'nota',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column('text')
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number | null;

  @Column({ type: 'date' })
  date: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, (horse) => horse.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @OneToMany(() => EventPhoto, (photo) => photo.event, { cascade: true })
  photos: EventPhoto[];

  @CreateDateColumn()
  created_at: Date;
}
