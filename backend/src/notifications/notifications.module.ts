import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Notification } from './notification.entity';
import { NotificationSetting } from './notification-setting.entity';
import { User } from '../auth/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationsGateway } from './notifications.gateway';
import { EventCreatedListener } from './listeners/event-created.listener';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationSetting, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'handicapp-secret-dev',
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
  ],
  controllers: [NotificationsController, NotificationSettingsController],
  providers: [
    NotificationsService,
    NotificationSettingsService,
    NotificationsGateway,
    EventCreatedListener,
  ],
  exports: [NotificationsService, NotificationSettingsService],
})
export class NotificationsModule {}
