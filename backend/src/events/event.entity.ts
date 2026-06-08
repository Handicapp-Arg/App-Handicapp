import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';
import { EventPhoto } from './event-photo.entity';


export enum EventType {
  SALUD = 'salud',
  ENTRENAMIENTO = 'entrenamiento',
  GASTO = 'gasto',
  NOTA = 'nota',
}

export enum ExpenseCategory {
  ALIMENTACION = 'alimentacion',
  VETERINARIO = 'veterinario',
  HERRADERO = 'herradero',
  ENTRENAMIENTO = 'entrenamiento',
  MANTENIMIENTO = 'mantenimiento',
  TRANSPORTE = 'transporte',
  OTROS = 'otros',
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

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: 'ARS' | 'USD';

  @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
  expense_category: ExpenseCategory | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  event_time: string | null; // HH:MM

  @Column({ type: 'varchar', default: 'none' })
  recurrence_type: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

  @Column({ type: 'date', nullable: true })
  recurrence_end: string | null;

  @Column('uuid', { nullable: true })
  recurrence_parent_id: string | null;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, (horse) => horse.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @OneToMany(() => EventPhoto, (photo) => photo.event, { cascade: true })
  photos: EventPhoto[];

  // Quién registró el evento (puede ser dueño, vet, establecimiento)
  @Column('uuid', { nullable: true })
  author_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'author_id' })
  author: User | null;

  // El dueño puede hacer visible este evento en el perfil público del caballo
  @Column({ type: 'boolean', default: false })
  is_public: boolean;

  // Si el evento fue compartido al feed, guardamos el post para no duplicar
  @Column('uuid', { nullable: true })
  feed_post_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;
}
