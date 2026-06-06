import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Horse } from '../../horses/horse.entity';

@Entity('pedigrees')
export class Pedigree {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column('uuid', { nullable: true })
  sire_id: string | null;

  @ManyToOne(() => Horse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sire_id' })
  sire: Horse | null;

  @Column('uuid', { nullable: true })
  dam_id: string | null;

  @ManyToOne(() => Horse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dam_id' })
  dam: Horse | null;

  @Column({ type: 'varchar', nullable: true })
  sire_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  dam_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  sire_registration_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  dam_registration_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  paternal_grandsire_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  paternal_granddam_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  maternal_grandsire_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  maternal_granddam_name: string | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_pedigree_data: Record<string, unknown> | null;

  @OneToMany(() => PedigreeValidation, (v) => v.pedigree)
  validations: PedigreeValidation[];

  @OneToMany(() => PedigreeDocument, (d) => d.pedigree)
  documents: PedigreeDocument[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export enum ValidationSource {
  STUDBOOK_AR = 'studbook_ar',
  SRA = 'sra',
  PEDIGREEQUERY = 'pedigreequery',
  MANUAL_ADMIN = 'manual_admin',
}

export enum ValidationStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  FAILED = 'failed',
  PARTIAL = 'partial',
  DISPUTED = 'disputed',
}

@Entity('pedigree_validations')
export class PedigreeValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  pedigree_id: string;

  @ManyToOne(() => Pedigree, (p) => p.validations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedigree_id' })
  pedigree: Pedigree;

  @Column({ type: 'enum', enum: ValidationSource })
  source: ValidationSource;

  @Column({ type: 'enum', enum: ValidationStatus })
  status: ValidationStatus;

  @Column({ type: 'jsonb', default: {} })
  validated_fields: Record<string, boolean>;

  @Column({ type: 'jsonb', nullable: true })
  discrepancies: Record<string, unknown> | null;

  @Column('uuid', { nullable: true })
  validated_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  validated_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  document_url: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;
}

export enum DocumentType {
  OFFICIAL_CERTIFICATE = 'official_certificate',
  DNA_CERTIFICATE = 'dna_certificate',
  TRANSFER_DOCUMENT = 'transfer_document',
  OTHER = 'other',
}

@Entity('pedigree_documents')
export class PedigreeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  pedigree_id: string;

  @ManyToOne(() => Pedigree, (p) => p.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedigree_id' })
  pedigree: Pedigree;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column({ type: 'varchar' })
  file_url: string;

  @Column({ type: 'varchar' })
  file_name: string;

  @Column('uuid')
  uploaded_by: string;

  @CreateDateColumn()
  created_at: Date;
}
