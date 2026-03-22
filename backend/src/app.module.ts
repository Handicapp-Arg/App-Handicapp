import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { HorsesModule } from './horses/horses.module';
import { EventsModule } from './events/events.module';
import { PermissionsModule } from './permissions/permissions.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig()),
    RolesModule,
    PermissionsModule,
    AuthModule,
    HorsesModule,
    EventsModule,
    DatabaseModule,
  ],
})
export class AppModule {}
