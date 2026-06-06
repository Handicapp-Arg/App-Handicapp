import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Auction } from './auction.entity';

@Entity('auction_watches')
@Unique(['auction_id', 'user_id'])
export class AuctionWatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  auction_id: string;

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
