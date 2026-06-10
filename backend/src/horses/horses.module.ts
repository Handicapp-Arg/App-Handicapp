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
import { HorseMovement } from './horse-movement.entity';
import { WeightRecord } from './weight-record.entity';
import { ShareToken } from './share-token.entity';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { HorseRecordsModule } from '../horse-records/horse-records.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horse, HorseUser, HorseDocument, HorseMovement, WeightRecord, ShareToken]),
    MulterModule.register({ storage: multer.memoryStorage() }),
    AuthModule,
    PlansModule,
    HorseRecordsModule,
  ],
  controllers: [HorsesController, HorsesPublicController],
  providers: [HorsesService],
  exports: [HorsesService],
})
export class HorsesModule {}
