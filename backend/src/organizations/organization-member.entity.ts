import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../auth/user.entity';

// Rol del usuario dentro de la organización
// admin: puede invitar, expulsar, ver facturación, gestionar el plan
// staff: equivale a "establecimiento" — puede crear caballos, eventos, contratos
// owner_role: propietario invitado — solo ve sus caballos
// vet: veterinario invitado — ve los caballos asignados
// encargado: brazo derecho — gestiona caballos/eventos/agenda, sin facturación ni plan
// jinete: monta y entrena — ve caballos asignados, registra entrenamientos
// peon: tareas de campo — registra tareas sobre caballos asignados
export type OrgMemberRole =
  | 'admin' | 'staff' | 'owner_role' | 'vet'
  | 'encargado' | 'jinete' | 'peon';

@Entity('organization_members')
@Unique(['organization_id', 'user_id'])
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organization_id: string;

  @ManyToOne(() => Organization, (o) => o.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  role_in_org: OrgMemberRole;

  @CreateDateColumn()
  joined_at: Date;
}
