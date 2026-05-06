import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { HorsesController } from './horses.controller';
import { HorsesPublicController } from './horses-public.controller';
import { HorsesService } from './horses.service';
import { Horse } from './horse.entity';
import { HorseUser } from './horse-user.entity';
import { HorseDocument } from './horse-document.entity';
import { WeightRecord } from './weight-record.entity';
import { ShareToken } from './share-token.entity';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horse, HorseUser, HorseDocument, WeightRecord, ShareToken]),
    MulterModule.register({ storage: multer.memoryStorage() }),
    AuthModule,
    PlansModule,
  ],
  controllers: [HorsesController, HorsesPublicController],
  providers: [HorsesService],
  exports: [HorsesService],
})
export class HorsesModule {}
