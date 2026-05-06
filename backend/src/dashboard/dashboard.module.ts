import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Event } from '../events/event.entity';
import { MedicalRecord } from '../medical/medical-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Horse, Event, MedicalRecord])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
