import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../auth/user.entity';
import type { OrgMemberRole } from './organization-member.entity';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

@Entity('organization_invitations')
export class OrganizationInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  email: string;

  @Column({ type: 'varchar' })
  role_in_org: OrgMemberRole;

  // Token único para el link de invitación
  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: InvitationStatus;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column('uuid')
  invited_by: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invited_by' })
  inviter: User;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
