import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { Auction } from './auction.entity';
import { AuctionBid } from './auction-bid.entity';
import { AuctionWatch } from './auction-watch.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, AuctionBid, AuctionWatch, Horse, HorseUser])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
