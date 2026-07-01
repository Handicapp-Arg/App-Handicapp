import {
  Entity, PrimaryGeneratedColumn, Column, Unique,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

// Plan como DATO (editable por el super admin), no hardcodeado.
// Se resuelve por (role_target + tier_key): así user.plan / organization.plan
// siguen guardando el tier ('free'|'pro'|'basic'|...) sin migrar datos.
export type PlanRoleTarget =
  | 'propietario' | 'veterinario' | 'establecimiento' | 'haras';

// Flags de features que habilitan el gating (hasFeature).
export type PlanFeature =
  | 'whatsapp' | 'libreta_digital' | 'reportes' | 'reproductivo';

@Entity('plans')
@Unique(['role_target', 'tier_key'])
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  role_target: PlanRoleTarget;

  @Column({ type: 'varchar' })
  tier_key: string; // 'free' | 'pro' | 'premium' | 'basic' | 'enterprise'

  @Column({ type: 'varchar' })
  name: string;

  // Orden dentro del rol (0 = plan base/free). Para ordenar y comparar tiers.
  @Column({ type: 'int', default: 0 })
  tier: number;

  // Precio mensual en ARS (0 = gratis). Referencial hasta integrar MercadoPago.
  @Column({ type: 'int', default: 0 })
  price_ars: number;

  // null = ilimitado
  @Column({ type: 'int', nullable: true })
  horse_limit: number | null;

  @Column({ type: 'int', nullable: true })
  staff_limit: number | null;

  // Features habilitadas (ver PlanFeature).
  @Column({ type: 'jsonb', default: () => "'[]'" })
  features: PlanFeature[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
