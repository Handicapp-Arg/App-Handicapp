import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Bill } from './bill.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bill]),
    NotificationsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
