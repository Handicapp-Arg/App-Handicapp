import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum RoleName {
  ADMIN = 'admin',
  PROPIETARIO = 'propietario',
  ESTABLECIMIENTO = 'establecimiento',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;
}
