import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { typeOrmConfig } from './config/typeorm.config';
import { RolesModule } from './roles/roles.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { HorsesModule } from './horses/horses.module';
import { EventsModule } from './events/events.module';
import { PermissionsModule } from './permissions/permissions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CatalogItemsModule } from './catalog-items/catalog-items.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { HealthRemindersModule } from './health-reminders/health-reminders.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig()),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    RolesModule,
    CloudinaryModule,
    PermissionsModule,
    AuthModule,
    HorsesModule,
    EventsModule,
    NotificationsModule,
    CatalogItemsModule,
    DashboardModule,
    EmailModule,
    HealthRemindersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
