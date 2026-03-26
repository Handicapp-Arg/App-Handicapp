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

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
