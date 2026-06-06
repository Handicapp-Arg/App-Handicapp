import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { AuctionsQueryDto } from './dto/auctions-query.dto';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly service: AuctionsService) {}

  // ─── Listado público (autenticado para ver favoritos) ───────────────────
  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@Query() query: AuctionsQueryDto, @GetUser('id') userId: string) {
    return this.service.findAll(query, userId);
  }

  @Get('me/selling')
  @UseGuards(AuthGuard('jwt'))
  mySelling(@GetUser('id') userId: string) {
    return this.service.myAuctions(userId);
  }

  @Get('me/watching')
  @UseGuards(AuthGuard('jwt'))
  myWatching(@GetUser('id') userId: string) {
    return this.service.myWatched(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Get(':id/bids')
  @UseGuards(AuthGuard('jwt'))
  getBids(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getBids(id);
  }

  // ─── Creación y gestión (vendedor) ──────────────────────────────────────
  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateAuctionDto, @GetUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id/publish')
  @UseGuards(AuthGuard('jwt'))
  publish(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') userId: string) {
    return this.service.publish(id, userId);
  }

  @Patch(':id/pause')
  @UseGuards(AuthGuard('jwt'))
  pause(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') userId: string) {
    return this.service.pause(id, userId);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancel(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') userId: string) {
    return this.service.cancel(id, userId);
  }

  @Patch(':id/bids/:bidId/accept')
  @UseGuards(AuthGuard('jwt'))
  acceptBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bidId', ParseUUIDPipe) bidId: string,
    @GetUser('id') userId: string,
  ) {
    return this.service.acceptBid(id, bidId, userId);
  }

  // ─── Pujas ───────────────────────────────────────────────────────────────
  @Post(':id/bids')
  @UseGuards(AuthGuard('jwt'))
  placeBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlaceBidDto,
    @GetUser('id') userId: string,
  ) {
    return this.service.placeBid(id, dto, userId);
  }

  // ─── Seguimiento ─────────────────────────────────────────────────────────
  @Post(':id/watch')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  toggleWatch(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') userId: string) {
    return this.service.toggleWatch(id, userId);
  }
}
