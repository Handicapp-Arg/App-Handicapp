import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Horse } from './horse.entity';
import { User } from '../auth/user.entity';

@Entity('weight_records')
export class WeightRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  weight_kg: number;

  // Escala 1-9 de condición corporal (Henneke Body Condition Score)
  @Column({ type: 'smallint', nullable: true })
  body_condition: number | null;

  @Column({ type: 'date' })
  date: string;

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
