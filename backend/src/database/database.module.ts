import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { AdminSeeder } from './seeders/admin.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AdminSeeder],
})
export class DatabaseModule {}
