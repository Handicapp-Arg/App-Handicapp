import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { typeOrmConfig } from './config/typeorm.config';
import { RolesModule } from './roles/roles.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { HorsesModule } from './horses/horses.module';
import { EventsModule } from './events/events.module';
import { PermissionsModule } from './permissions/permissions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CatalogItemsModule } from './catalog-items/catalog-items.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig()),
    EventEmitterModule.forRoot(),
    RolesModule,
    CloudinaryModule,
    PermissionsModule,
    AuthModule,
    HorsesModule,
    EventsModule,
    NotificationsModule,
    CatalogItemsModule,
  ],
})
export class AppModule {}
