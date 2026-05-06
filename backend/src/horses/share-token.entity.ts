import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Horse } from './horse.entity';
import { User } from '../auth/user.entity';

@Entity('share_tokens')
export class ShareToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  token: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column('uuid')
  created_by: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
