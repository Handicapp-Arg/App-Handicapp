import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';

export enum AppointmentType {
  VET = 'veterinario',
  FARRIER = 'herrador',
  COMPETITION = 'competencia',
  DEWORMING = 'desparasitacion',
  VACCINE = 'vacuna',
  TRAINING = 'entrenamiento',
  OTHER = 'otro',
}

@Entity('service_appointments')
export class ServiceAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column({ type: 'enum', enum: AppointmentType })
  type: AppointmentType;

  @Column()
  title: string;

  @Column({ type: 'timestamptz' })
  scheduled_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Quién atiende el turno (vet, herrador, etc.). Texto libre a propósito: la
  // mayoría de los profesionales no son usuarios de la app, así que exigir una
  // relación dejaría el dato sin poder cargarse.
  @Column({ type: 'varchar', length: 120, nullable: true })
  professional: string | null;

  // Cuántas horas antes avisar. Default 24 para que los turnos ya existentes
  // conserven el comportamiento histórico; NULL (o 0) significa "no avisar".
  @Column({ type: 'int', nullable: true, default: 24 })
  remind_hours_before: number | null;

  @Column({ default: false })
  completed: boolean;

  @Column({ default: false })
  reminder_sent: boolean;

  @Column('uuid')
  created_by: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  created_at: Date;
}
