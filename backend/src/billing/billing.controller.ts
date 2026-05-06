import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ValidationPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(AuthGuard('jwt'))
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  findAll(@GetUser() user: User) {
    return this.billingService.findByUser(user);
  }

  @Post()
  create(@Body(ValidationPipe) dto: CreateBillDto, @GetUser() user: User) {
    return this.billingService.create(dto, user);
  }

  @Patch(':id/send')
  send(@Param('id') id: string, @GetUser() user: User) {
    return this.billingService.send(id, user);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @GetUser() user: User) {
    return this.billingService.approve(id, user);
  }

  @Patch(':id/dispute')
  dispute(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @GetUser() user: User,
  ) {
    return this.billingService.dispute(id, reason, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.billingService.remove(id, user);
  }
}
