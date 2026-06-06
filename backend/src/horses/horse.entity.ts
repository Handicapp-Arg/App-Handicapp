import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../auth/user.entity';
import { Event } from '../events/event.entity';
import { HorseUser } from './horse-user.entity';
import { CatalogItem } from '../catalog-items/catalog-item.entity';
import { HorseRecord } from '../horse-records/horse-record.entity';

@Entity('horses')
export class Horse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date', nullable: true })
  birth_date: string | null;

  @Column({ type: 'varchar', nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  image_public_id: string | null;

  @Column('uuid')
  owner_id: string;

  @ManyToOne(() => User, (user) => user.horses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column('uuid', { nullable: true })
  establishment_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: User;

  // Organización que gestiona el caballo (temporal, mutable, puede ser null).
  // El propietario es siempre dueño de los datos (owner_id).
  @Column('uuid', { nullable: true })
  organization_id: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true, unique: true })
  microchip: string | null;

  @Column({ type: 'uuid', unique: true, nullable: true })
  public_token: string | null;

  @BeforeInsert()
  generatePublicToken() {
    if (!this.public_token) this.public_token = randomUUID();
  }

  @Column('uuid', { nullable: true })
  breed_id: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'breed_id' })
  breed: CatalogItem;

  @Column('uuid', { nullable: true })
  activity_id: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activity_id' })
  activity: CatalogItem;

  @OneToMany(() => Event, (event) => event.horse)
  events: Event[];

  @OneToMany(() => HorseUser, (hu) => hu.horse)
  horseUsers: HorseUser[];

  @Column({ type: 'varchar', nullable: true })
  registration_number: string | null;

  @Column({
    type: 'enum',
    enum: ['studbook_ar', 'sra', 'accc', 'aqha', 'other'],
    nullable: true,
  })
  registration_source: 'studbook_ar' | 'sra' | 'accc' | 'aqha' | 'other' | null;

  @Column({
    type: 'enum',
    enum: ['macho', 'hembra', 'castrado'],
    nullable: true,
  })
  sex: 'macho' | 'hembra' | 'castrado' | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  color: string | null;

  // Alzada en centímetros (e.g. 158)
  @Column({ type: 'smallint', nullable: true })
  height_cm: number | null;

  // Apunta al registro global scraped del mismo caballo (si fue validado)
  @Column('uuid', { nullable: true })
  horse_record_id: string | null;

  @ManyToOne(() => HorseRecord, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'horse_record_id' })
  horse_record: HorseRecord | null;

  @Column({
    type: 'enum',
    enum: ['unverified', 'pending', 'partial', 'verified', 'disputed'],
    default: 'unverified',
  })
  pedigree_status: 'unverified' | 'pending' | 'partial' | 'verified' | 'disputed';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;
}
