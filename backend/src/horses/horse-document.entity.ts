import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Horse } from './horse.entity';

@Entity('horse_documents')
export class HorseDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column()
  public_id: string;

  @Column({ type: 'varchar', default: 'pdf' })
  file_type: 'pdf' | 'image';

  @CreateDateColumn()
  created_at: Date;
}
