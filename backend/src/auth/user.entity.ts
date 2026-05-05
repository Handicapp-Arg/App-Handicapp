import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column()
  role: string;

  @OneToMany(() => Horse, (horse) => horse.owner)
  horses: Horse[];

  @Column({ type: 'varchar', nullable: true, select: false })
  reset_token: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reset_token_expires: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
