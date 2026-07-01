import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Horse } from '../horses/horse.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column()
  role: string;

  @OneToMany(() => Horse, (horse) => horse.owner)
  horses: Horse[];

  @Column({ type: 'varchar', default: 'free' })
  plan: string;

  @Column({ type: 'timestamptz', nullable: true })
  plan_expires_at: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  reset_token: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reset_token_expires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  push_token: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar_public_id: string | null;

  // Color de avatar elegido por el usuario (id de tono de la paleta de marca).
  // null = automático (derivado del nombre). Ver avatar-color en web/móvil.
  @Column({ type: 'varchar', length: 24, nullable: true })
  avatar_color: string | null;

  @Column({ type: 'varchar', nullable: true })
  cover_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  cover_public_id: string | null;

  // ─── Matrícula profesional del veterinario (validada por el superadmin) ───
  @Column({ type: 'varchar', nullable: true })
  vet_license_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  vet_province: string | null;

  @Column({ type: 'varchar', nullable: true })
  vet_license_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  vet_license_public_id: string | null;

  // none | pending | approved | rejected
  @Column({ type: 'varchar', default: 'none' })
  vet_license_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
