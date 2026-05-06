import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';

export enum ActivityPhotoType {
  FEEDING = 'alimentacion',
  TRAINING = 'entrenamiento',
  REST = 'descanso',
  VET = 'veterinario',
  OTHER = 'otro',
}

@Entity('activity_photos')
export class ActivityPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column()
  url: string;

  @Column()
  public_id: string;

  @Column({ type: 'enum', enum: ActivityPhotoType, default: ActivityPhotoType.OTHER })
  activity_type: ActivityPhotoType;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  // Timestamp del servidor — no manipulable por el cliente
  @Column({ type: 'timestamptz' })
  taken_at: Date;

  @Column('uuid')
  taken_by: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'taken_by' })
  photographer: User;

  @CreateDateColumn()
  created_at: Date;
}
