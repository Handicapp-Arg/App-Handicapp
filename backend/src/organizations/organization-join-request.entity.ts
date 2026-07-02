import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';

export type OrganizationJoinRequestStatus = 'pending' | 'accepted' | 'rejected';

@Entity('organization_join_requests')
export class OrganizationJoinRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organization_id: string;

  @Column('uuid')
  requester_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: OrganizationJoinRequestStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
