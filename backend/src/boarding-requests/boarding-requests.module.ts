import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardingRequest } from './boarding-request.entity';
import { Horse } from '../horses/horse.entity';
import { BoardingRequestsService } from './boarding-requests.service';
import { BoardingRequestsController } from './boarding-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BoardingRequest, Horse]),
    NotificationsModule,
  ],
  controllers: [BoardingRequestsController],
  providers: [BoardingRequestsService],
})
export class BoardingRequestsModule {}
