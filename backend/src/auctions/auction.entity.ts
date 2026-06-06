import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { AuctionBid } from './auction-bid.entity';

export type AuctionType = 'venta_directa' | 'remate';
export type AuctionStatus = 'draft' | 'active' | 'paused' | 'closed' | 'sold' | 'cancelled';
export type AuctionCurrency = 'ARS' | 'USD';

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  horse_id: string;

  @ManyToOne(() => Horse, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse;

  @Column('uuid')
  seller_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ type: 'enum', enum: ['venta_directa', 'remate'], default: 'venta_directa' })
  type: AuctionType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // venta_directa: precio pedido
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  asking_price: number | null;

  // remate: puja inicial, precio de reserva (secreto), incremento mínimo
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  starting_bid: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  reserve_price: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  bid_increment: number | null;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency: AuctionCurrency;

  // Ventana temporal del remate (solo para tipo 'remate')
  @Column({ type: 'timestamptz', nullable: true })
  auction_start: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  auction_end: Date | null;

  @Column({ type: 'enum', enum: ['draft', 'active', 'paused', 'closed', 'sold', 'cancelled'], default: 'draft' })
  status: AuctionStatus;

  // Resultado
  @Column('uuid', { nullable: true })
  winner_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'winner_id' })
  winner: User | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  winning_price: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date | null;

  // Documentación legal Argentina (SENASA + titularidad)
  @Column({ type: 'boolean', default: false })
  has_health_cert: boolean;

  @Column({ type: 'varchar', nullable: true })
  health_cert_url: string | null;

  @Column({ type: 'boolean', default: false })
  has_ownership_docs: boolean;

  // Condiciones de venta
  @Column({ type: 'text', nullable: true })
  payment_terms: string | null;

  @Column({ type: 'text', nullable: true })
  delivery_terms: string | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  // Fee de plataforma sobre precio final (%)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3.0 })
  platform_fee_pct: number;

  @OneToMany(() => AuctionBid, (b) => b.auction, { cascade: false })
  bids: AuctionBid[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
