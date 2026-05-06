import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';

export type ContractStatus = 'pending' | 'signed' | 'rejected';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  establishment_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: User;

  @Column('uuid')
  owner_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column('uuid', { nullable: true })
  horse_id: string | null;

  @ManyToOne(() => Horse, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse | null;

  @Column('text')
  title: string;

  @Column('text')
  body: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: ContractStatus;

  @Column({ type: 'varchar', nullable: true })
  signed_name: string | null;

  @Column({ type: 'timestamp', nullable: true })
  signed_at: Date | null;

  @Column('text', { nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
