import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';

export enum MedicalRecordType {
  VACCINE = 'vacuna',
  DEWORMING = 'desparasitacion',
  LAB = 'analisis',
  TREATMENT = 'tratamiento',
  SANIDAD = 'sanidad',
}

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  // Guardado como varchar (no enum de Postgres) para poder agregar tipos nuevos
  // sin depender de ALTER TYPE. La validación de valores vive en el DTO (MedicalRecordType).
  @Column({ type: 'varchar' })
  type: MedicalRecordType;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: string;

  // Próxima aplicación calculada
  @Column({ type: 'date', nullable: true })
  next_due: string | null;

  // Laboratorio / producto / marca
  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  // Lote / número de serie
  @Column({ type: 'varchar', nullable: true })
  batch: string | null;

  // Dosis / notas adicionales
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column('uuid')
  recorded_by: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'recorded_by' })
  recorder: User;

  @CreateDateColumn()
  created_at: Date;
}
