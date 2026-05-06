import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('training_metrics')
export class TrainingMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  event_id: string;

  @OneToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  distance_km: number | null;

  @Column({ type: 'int', nullable: true })
  duration_min: number | null;

  // 1 = Muy liviano, 5 = Máximo esfuerzo
  @Column({ type: 'smallint', nullable: true })
  intensity: number | null;

  @Column({ type: 'varchar', nullable: true })
  discipline: string | null;
}
