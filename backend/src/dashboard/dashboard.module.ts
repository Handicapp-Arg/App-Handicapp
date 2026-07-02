import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Event } from '../events/event.entity';
import { MedicalRecord } from '../medical/medical-record.entity';
import { DailyRoutine } from '../routines/daily-routine.entity';
import { ActivityPhoto } from '../activity-photos/activity-photo.entity';
import { TrainingMetrics } from '../events/training-metrics.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Horse,
      Event,
      MedicalRecord,
      DailyRoutine,
      ActivityPhoto,
      TrainingMetrics,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
