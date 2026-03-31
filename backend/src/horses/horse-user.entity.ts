import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Horse } from './horse.entity';
import { User } from '../auth/user.entity';

@Entity('horse_users')
@Unique(['horse_id', 'user_id'])
export class HorseUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, (horse) => horse.horseUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', nullable: true, default: null })
  percentage: number | null;

  @Column({ type: 'varchar', default: 'access' })
  role: 'owner' | 'access';
}
