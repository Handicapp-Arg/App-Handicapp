import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { User } from '../auth/user.entity';

export type ScrapeStatus   = 'pending' | 'scraping' | 'done' | 'failed' | 'skipped';
export type OwnershipStatus = 'unverified' | 'pending_claim' | 'verified' | 'disputed';
export type RecordSource =
  | 'allbreed'
  | 'pedigreequery'
  | 'studbook_ar'
  | 'sra'
  | 'aqha'
  | 'jockey_club_usa'
  | 'racing_post'
  | 'weatherbys'
  | 'manual'
  | 'other';

@Entity('horse_records')
@Index(['name', 'birth_year', 'registration_source'], { unique: false })
@Index('idx_hr_name_trgm', { synchronize: false }) // created manually for pg_trgm full-text
export class HorseRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // birth_year para filtrar rápido; birth_date si tenemos el día exacto
  @Column({ type: 'smallint', nullable: true })
  birth_year: number | null;

  @Column({ type: 'date', nullable: true })
  birth_date: string | null;

  @Column({ type: 'enum', enum: ['macho', 'hembra', 'castrado'], nullable: true })
  sex: 'macho' | 'hembra' | 'castrado' | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  breed: string | null;

  // ISO 3166-1 alpha-3 (ARG, USA, GBR, IRE, FRA, BRZ, AUS…)
  @Column({ type: 'char', length: 3, nullable: true })
  country_code: string | null;

  @Column({ type: 'varchar', nullable: true })
  registration_number: string | null;

  @Column({
    type: 'enum',
    enum: ['allbreed', 'pedigreequery', 'studbook_ar', 'sra', 'aqha', 'jockey_club_usa', 'racing_post', 'weatherbys', 'manual', 'other'],
    nullable: true,
  })
  registration_source: RecordSource | null;

  @Column({ type: 'varchar', nullable: true })
  source_url: string | null;

  // ─── Árbol genealógico (auto-referencial) ───────────────────────────────
  @Column('uuid', { nullable: true })
  sire_id: string | null;

  @ManyToOne(() => HorseRecord, (r) => r.progeny_as_sire, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sire_id' })
  sire: HorseRecord | null;

  // Nombre textual del padre cuando todavía no está scraped como record propio
  @Column({ type: 'varchar', nullable: true })
  sire_name: string | null;

  @Column('uuid', { nullable: true })
  dam_id: string | null;

  @ManyToOne(() => HorseRecord, (r) => r.progeny_as_dam, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dam_id' })
  dam: HorseRecord | null;

  @Column({ type: 'varchar', nullable: true })
  dam_name: string | null;

  // Navegación inversa (hijos)
  @OneToMany(() => HorseRecord, (r) => r.sire)
  progeny_as_sire: HorseRecord[];

  @OneToMany(() => HorseRecord, (r) => r.dam)
  progeny_as_dam: HorseRecord[];

  // ─── Propiedad validada ──────────────────────────────────────────────────
  @Column('uuid', { nullable: true })
  verified_owner_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'verified_owner_id' })
  verified_owner: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @Column({
    type: 'enum',
    enum: ['unverified', 'pending_claim', 'verified', 'disputed'],
    default: 'unverified',
  })
  ownership_status: OwnershipStatus;

  // ─── Metadata de scraping ────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['pending', 'scraping', 'done', 'failed', 'skipped'],
    default: 'pending',
  })
  scrape_status: ScrapeStatus;

  // Cuántas veces intentamos scraping sin éxito
  @Column({ type: 'smallint', default: 0 })
  scrape_attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_scraped_at: Date | null;

  @Column({
    type: 'enum',
    enum: ['high', 'medium', 'low'],
    nullable: true,
  })
  data_confidence: 'high' | 'medium' | 'low' | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
