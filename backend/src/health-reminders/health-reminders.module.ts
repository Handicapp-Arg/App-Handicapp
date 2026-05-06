import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthRemindersService } from './health-reminders.service';
import { MedicalRemindersService } from './medical-reminders.service';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { MedicalRecord } from '../medical/medical-record.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horse, HorseUser, MedicalRecord]),
    NotificationsModule,
    EmailModule,
  ],
  providers: [HealthRemindersService, MedicalRemindersService],
})
export class HealthRemindersModule {}
