import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { HorsesController } from './horses.controller';
import { HorsesService } from './horses.service';
import { Horse } from './horse.entity';
import { HorseUser } from './horse-user.entity';
import { HorseDocument } from './horse-document.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horse, HorseUser, HorseDocument]),
    MulterModule.register({ storage: multer.memoryStorage() }),
    AuthModule,
  ],
  controllers: [HorsesController],
  providers: [HorsesService],
  exports: [HorsesService],
})
export class HorsesModule {}
