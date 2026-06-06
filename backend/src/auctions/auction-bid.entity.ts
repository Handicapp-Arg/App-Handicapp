import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Auction } from './auction.entity';

export type BidStatus = 'active' | 'outbid' | 'won' | 'cancelled';

@Entity('auction_bids')
export class AuctionBid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  auction_id: string;

  @ManyToOne(() => Auction, (a) => a.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column('uuid')
  bidder_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'bidder_id' })
  bidder: User;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: 'ARS' | 'USD';

  @Column({ type: 'enum', enum: ['active', 'outbid', 'won', 'cancelled'], default: 'active' })
  status: BidStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;
}
