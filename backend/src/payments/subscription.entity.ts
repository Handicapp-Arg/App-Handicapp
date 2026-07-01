import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

// Suscripción a un plan pago (MercadoPago Preapproval).
export type SubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string; // quien paga (dueño de la cuenta / de la org)

  // Plan comprado (redundante con el Plan pero fijamos lo que se cobró).
  @Column({ type: 'varchar' })
  role_target: string; // propietario | veterinario | establecimiento | haras

  @Column({ type: 'varchar' })
  tier_key: string;

  @Column({ type: 'int', default: 0 })
  amount_ars: number;

  // Id del preapproval en MercadoPago.
  @Column({ type: 'varchar', nullable: true })
  mp_preapproval_id: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: SubscriptionStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
