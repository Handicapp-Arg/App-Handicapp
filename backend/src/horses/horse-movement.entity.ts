import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Horse } from './horse.entity';
import { User } from '../auth/user.entity';

export type MovementType =
  | 'transfer_ownership'
  | 'establishment_in'
  | 'establishment_out'
  | 'vet_assigned'
  | 'vet_removed'
  | 'member_assigned'
  | 'member_removed'
  | 'created';

@Entity('horse_movements')
export class HorseMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column({ type: 'varchar' })
  type: MovementType;

  @Column({ type: 'text' })
  description: string;

  @Column('uuid', { nullable: true })
  actor_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @CreateDateColumn()
  created_at: Date;
}
