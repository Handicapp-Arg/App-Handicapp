import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { HorseRecord } from './horse-record.entity';

export type ClaimStatus = 'pending' | 'auto_approved' | 'approved' | 'rejected';
export type FraudRisk = 'none' | 'low' | 'medium' | 'high';

export interface FraudSignal {
  key: string;
  weight: number; // 1 low · 2 medium · 3 high
  detail: string;
}

@Entity('horse_ownership_claims')
export class HorseOwnershipClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_record_id: string;

  @ManyToOne(() => HorseRecord, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'horse_record_id' })
  horse_record: HorseRecord;

  @Column('uuid')
  claimant_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'claimant_id' })
  claimant: User;

  // Lo que el usuario proporciona como prueba de propiedad
  @Column({ type: 'varchar', nullable: true })
  registration_number: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  microchip: string | null;

  @Column({ type: 'date', nullable: true })
  claimed_birth_date: string | null;

  // URL del certificado oficial subido (Cloudinary)
  @Column({ type: 'varchar', nullable: true })
  document_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  document_public_id: string | null;

  // Resultado de la validación automática
  // 0–100: qué tan bien matchean los datos contra el horse_record
  @Column({ type: 'smallint', nullable: true })
  match_score: number | null;

  // Qué campos matchearon
  @Column({ type: 'jsonb', nullable: true })
  matched_fields: string[] | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'auto_approved', 'approved', 'rejected'],
    default: 'pending',
  })
  status: ClaimStatus;

  // Admin que revisó manualmente
  @Column('uuid', { nullable: true })
  reviewed_by_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewed_by: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Señales de fraude detectadas automáticamente al momento del claim
  @Column({ type: 'jsonb', nullable: true })
  fraud_signals: FraudSignal[] | null;

  // Suma de pesos de señales: none=0, low=1-2, medium=3-4, high=5+
  @Column({ type: 'varchar', length: 10, default: 'none' })
  fraud_risk: FraudRisk;

  // true si fue auto-aprobado con evidencia débil (una sola prueba sin número de registro)
  // el admin puede auditar y revocar si considera que el claim es fraudulento
  @Column({ type: 'boolean', default: false })
  needs_audit: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
