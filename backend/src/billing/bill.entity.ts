import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';

export enum BillStatus {
  DRAFT = 'borrador',
  SENT = 'enviada',
  APPROVED = 'aprobada',
  DISPUTED = 'disputada',
}

export interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

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

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'jsonb', default: '[]' })
  items: BillItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: 'ARS' | 'USD';

  @Column({ type: 'enum', enum: BillStatus, default: BillStatus.DRAFT })
  status: BillStatus;

  @Column({ type: 'text', nullable: true })
  dispute_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
