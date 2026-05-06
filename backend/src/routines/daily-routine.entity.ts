import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';
import { User } from '../auth/user.entity';

@Entity('daily_routines')
@Unique(['horse_id', 'date'])
export class DailyRoutine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column({ type: 'date' })
  date: string;

  // Alimentación
  @Column({ default: false })
  morning_feed: boolean;

  @Column({ default: false })
  afternoon_feed: boolean;

  @Column({ default: false })
  evening_feed: boolean;

  @Column({ default: false })
  water_ok: boolean;

  // Actividad
  @Column({ default: false })
  paddock: boolean;

  @Column({ default: false })
  trained: boolean;

  // Salud
  @Column({ default: false })
  health_check: boolean;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column('uuid')
  filled_by: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'filled_by' })
  filler: User;

  @CreateDateColumn()
  created_at: Date;
}
