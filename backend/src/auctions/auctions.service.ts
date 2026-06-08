import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Auction, AuctionStatus } from './auction.entity';
import { AuctionBid } from './auction-bid.entity';
import { AuctionWatch } from './auction-watch.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { AuctionsQueryDto } from './dto/auctions-query.dto';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction) private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(AuctionBid) private readonly bidRepo: Repository<AuctionBid>,
    @InjectRepository(AuctionWatch) private readonly watchRepo: Repository<AuctionWatch>,
    @InjectRepository(Horse) private readonly horseRepo: Repository<Horse>,
    @InjectRepository(HorseUser) private readonly horseUserRepo: Repository<HorseUser>,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateAuctionDto, sellerId: string): Promise<Auction> {
    const horse = await this.horseRepo.findOne({ where: { id: dto.horse_id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    const isOwner = horse.owner_id === sellerId;
    if (!isOwner) {
      const coOwner = await this.horseUserRepo.findOne({ where: { horse_id: dto.horse_id, user_id: sellerId } });
      if (!coOwner) throw new ForbiddenException('Solo el propietario puede crear una subasta');
    }

    const existing = await this.auctionRepo.findOne({
      where: [
        { horse_id: dto.horse_id, status: 'active' },
        { horse_id: dto.horse_id, status: 'draft' },
      ],
    });
    if (existing) throw new ConflictException('Este caballo ya tiene una subasta activa o en borrador');

    if (dto.type === 'remate') {
      if (!dto.auction_start || !dto.auction_end) {
        throw new BadRequestException('Los remates requieren fecha de inicio y fin');
      }
      const start = new Date(dto.auction_start);
      const end = new Date(dto.auction_end);
      if (end <= start) throw new BadRequestException('La fecha de fin debe ser posterior al inicio');
      const minDuration = 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() < minDuration) {
        throw new BadRequestException('El remate debe durar al menos 24 horas');
      }
    }

    const auction = this.auctionRepo.create({
      ...dto,
      seller_id: sellerId,
      auction_start: dto.auction_start ? new Date(dto.auction_start) : null,
      auction_end: dto.auction_end ? new Date(dto.auction_end) : null,
      status: 'draft',
    });

    return this.auctionRepo.save(auction);
  }

  async findAll(query: AuctionsQueryDto, userId?: string) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const qb = this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.horse', 'horse')
      .leftJoinAndSelect('a.seller', 'seller')
      .leftJoinAndSelect('a.winner', 'winner')
      .loadRelationCountAndMap('a.bid_count', 'a.bids')
      .where('a.status != :cancelled', { cancelled: 'cancelled' });

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    if (query.q) {
      qb.andWhere('(a.title ILIKE :q OR horse.name ILIKE :q)', { q: `%${query.q}%` });
    }

    qb.orderBy('a.created_at', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();

    let watchedIds: Set<string> = new Set();
    if (userId) {
      const watches = await this.watchRepo.find({ where: { user_id: userId } });
      watchedIds = new Set(watches.map((w) => w.auction_id));
    }

    return {
      data: data.map((a) => ({ ...a, watching: watchedIds.has(a.id) })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId?: string): Promise<Auction & { watching?: boolean; top_bid?: number | null }> {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['horse', 'seller', 'winner', 'bids', 'bids.bidder'],
    });
    if (!auction) throw new NotFoundException('Subasta no encontrada');

    let watching = false;
    if (userId) {
      watching = !!(await this.watchRepo.findOne({ where: { auction_id: id, user_id: userId } }));
    }

    const topBid = auction.bids
      ?.filter((b) => b.status === 'active' || b.status === 'won')
      .sort((a, b) => Number(b.amount) - Number(a.amount))[0] ?? null;

    return { ...auction, watching, top_bid: topBid ? Number(topBid.amount) : null };
  }

  async adminFindAll(): Promise<Auction[]> {
    return this.auctionRepo.find({
      relations: ['horse', 'seller'],
      order: { created_at: 'DESC' },
      take: 200,
    });
  }

  async publish(id: string, sellerId: string, isAdmin = false): Promise<Auction> {
    const auction = await this.findOneOwned(id, sellerId, isAdmin);
    if (auction.status !== 'draft') throw new BadRequestException('Solo se pueden publicar borradores');
    auction.status = 'active';
    return this.auctionRepo.save(auction);
  }

  async pause(id: string, sellerId: string, isAdmin = false): Promise<Auction> {
    const auction = await this.findOneOwned(id, sellerId, isAdmin);
    if (auction.status !== 'active') throw new BadRequestException('Solo se puede pausar una subasta activa');
    auction.status = 'paused';
    return this.auctionRepo.save(auction);
  }

  async cancel(id: string, sellerId: string, isAdmin = false): Promise<Auction> {
    const auction = await this.findOneOwned(id, sellerId, isAdmin);
    if (['sold', 'cancelled'].includes(auction.status)) {
      throw new BadRequestException('No se puede cancelar esta subasta');
    }
    auction.status = 'cancelled';
    auction.closed_at = new Date();
    return this.auctionRepo.save(auction);
  }

  async placeBid(auctionId: string, dto: PlaceBidDto, bidderId: string): Promise<AuctionBid> {
    return this.dataSource.transaction(async (em) => {
      const auction = await em.findOne(Auction, { where: { id: auctionId }, lock: { mode: 'pessimistic_write' } });
      if (!auction) throw new NotFoundException('Subasta no encontrada');
      if (auction.status !== 'active') throw new BadRequestException('La subasta no está activa');
      if (auction.seller_id === bidderId) throw new ForbiddenException('No podés pujar en tu propia subasta');
      if (auction.type !== 'remate') throw new BadRequestException('Esta subasta es de precio fijo');

      const now = new Date();
      if (auction.auction_end && now > auction.auction_end) {
        throw new BadRequestException('El remate ya cerró');
      }

      const topBid = await em.findOne(AuctionBid, {
        where: { auction_id: auctionId, status: 'active' },
        order: { amount: 'DESC' },
      });

      const minAmount = topBid
        ? Number(topBid.amount) + Number(auction.bid_increment ?? 1)
        : Number(auction.starting_bid ?? 0);

      if (dto.amount < minAmount) {
        throw new BadRequestException(`La puja mínima es ${minAmount} ${auction.currency}`);
      }

      // Marcar puja anterior como superada
      if (topBid) {
        topBid.status = 'outbid';
        await em.save(topBid);
      }

      const bid = em.create(AuctionBid, {
        auction_id: auctionId,
        bidder_id: bidderId,
        amount: dto.amount,
        currency: auction.currency,
        notes: dto.notes,
        status: 'active',
      });

      const saved = await em.save(bid);

      this.events.emit('auction.bid_placed', { auction, bid: saved, previousBidderId: topBid?.bidder_id });
      return saved;
    });
  }

  async acceptBid(auctionId: string, bidId: string, sellerId: string): Promise<Auction> {
    return this.dataSource.transaction(async (em) => {
      const auction = await em.findOne(Auction, { where: { id: auctionId }, lock: { mode: 'pessimistic_write' } });
      if (!auction) throw new NotFoundException('Subasta no encontrada');
      if (auction.seller_id !== sellerId) throw new ForbiddenException('No autorizado');
      if (auction.status !== 'active') throw new BadRequestException('La subasta no está activa');

      const bid = await em.findOne(AuctionBid, { where: { id: bidId, auction_id: auctionId, status: 'active' } });
      if (!bid) throw new NotFoundException('Puja no encontrada o ya superada');

      // Cancelar todas las otras pujas activas
      await em.query(
        `UPDATE auction_bids SET status = 'cancelled' WHERE auction_id = $1 AND id != $2`,
        [auctionId, bidId],
      );

      bid.status = 'won';
      await em.save(bid);

      auction.status = 'sold';
      auction.winner_id = bid.bidder_id;
      auction.winning_price = bid.amount;
      auction.closed_at = new Date();
      const saved = await em.save(auction);

      this.events.emit('auction.sold', { auction: saved, winnerId: bid.bidder_id, sellerId });
      return saved;
    });
  }

  async toggleWatch(auctionId: string, userId: string): Promise<{ watching: boolean }> {
    const existing = await this.watchRepo.findOne({ where: { auction_id: auctionId, user_id: userId } });
    if (existing) {
      await this.watchRepo.remove(existing);
      return { watching: false };
    }
    await this.watchRepo.save(this.watchRepo.create({ auction_id: auctionId, user_id: userId }));
    return { watching: true };
  }

  async getBids(auctionId: string): Promise<AuctionBid[]> {
    return this.bidRepo.find({
      where: { auction_id: auctionId },
      order: { amount: 'DESC', created_at: 'DESC' },
      relations: ['bidder'],
    });
  }

  async myAuctions(userId: string): Promise<Auction[]> {
    return this.auctionRepo.find({
      where: { seller_id: userId },
      relations: ['horse'],
      order: { created_at: 'DESC' },
    });
  }

  async myWatched(userId: string): Promise<Auction[]> {
    const watches = await this.watchRepo.find({
      where: { user_id: userId },
      relations: ['auction', 'auction.horse', 'auction.seller'],
    });
    return watches.map((w) => w.auction).filter(Boolean);
  }

  // Cierre automático de remates vencidos — corre cada minuto
  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredAuctions(): Promise<void> {
    const expired = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.type = :type', { type: 'remate' })
      .andWhere('a.status = :status', { status: 'active' })
      .andWhere('a.auction_end <= NOW()')
      .getMany();

    for (const auction of expired) {
      const topBid = await this.bidRepo.findOne({
        where: { auction_id: auction.id, status: 'active' },
        order: { amount: 'DESC' },
      });

      if (topBid && (!auction.reserve_price || Number(topBid.amount) >= Number(auction.reserve_price))) {
        topBid.status = 'won';
        await this.bidRepo.save(topBid);
        auction.status = 'sold';
        auction.winner_id = topBid.bidder_id;
        auction.winning_price = topBid.amount;
        this.events.emit('auction.sold', { auction, winnerId: topBid.bidder_id, sellerId: auction.seller_id });
      } else {
        auction.status = 'closed';
        this.events.emit('auction.closed_no_winner', { auction });
      }

      auction.closed_at = new Date();
      await this.auctionRepo.save(auction);
    }
  }

  private async findOneOwned(id: string, userId: string, isAdmin = false): Promise<Auction> {
    const auction = await this.auctionRepo.findOne({ where: { id } });
    if (!auction) throw new NotFoundException('Subasta no encontrada');
    if (!isAdmin && auction.seller_id !== userId) throw new ForbiddenException('No autorizado');
    return auction;
  }
}
