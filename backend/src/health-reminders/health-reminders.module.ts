import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthRemindersService } from './health-reminders.service';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horse, HorseUser]),
    NotificationsModule,
    EmailModule,
  ],
  providers: [HealthRemindersService],
})
export class HealthRemindersModule {}
