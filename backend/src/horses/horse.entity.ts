import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Event } from '../events/event.entity';
import { HorseUser } from './horse-user.entity';

@Entity('horses')
export class Horse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date', nullable: true })
  birth_date: string | null;

  @Column({ type: 'varchar', nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  image_public_id: string | null;

  @Column('uuid')
  owner_id: string;

  @ManyToOne(() => User, (user) => user.horses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column('uuid', { nullable: true })
  establishment_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: User;

  @OneToMany(() => Event, (event) => event.horse)
  events: Event[];

  @OneToMany(() => HorseUser, (hu) => hu.horse)
  horseUsers: HorseUser[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
