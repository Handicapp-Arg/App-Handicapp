import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { OrganizationMember } from './organization-member.entity';

export type OrganizationPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'trial';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Código de enlace para que otros usuarios soliciten unirse a la caballeriza
  @Column({ type: 'varchar', length: 8, unique: true, nullable: true })
  join_code: string | null;

  // Establecimiento dueño de la organización (paga el plan)
  @Column('uuid')
  owner_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  // Plan: free, basic, pro, enterprise
  @Column({ type: 'varchar', default: 'free' })
  plan: OrganizationPlan;

  // Límite de caballos según plan (null = ilimitado)
  @Column({ type: 'int', nullable: true })
  horse_limit: number | null;

  // Estado: activa, suspendida (por falta de pago), trial
  @Column({ type: 'varchar', default: 'active' })
  status: OrganizationStatus;

  // Vencimiento del plan (null = no vence)
  @Column({ type: 'timestamptz', nullable: true })
  plan_expires_at: Date | null;

  // Notas internas del superadmin
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => OrganizationMember, (m) => m.organization)
  members: OrganizationMember[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
