import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';
import { UserRole } from '../auth/user.entity';

@Entity('permissions')
@Unique(['role', 'resource', 'action'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column()
  resource: string;

  @Column()
  action: string;
}
