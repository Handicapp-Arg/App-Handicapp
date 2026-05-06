import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ActivityPhotosController } from './activity-photos.controller';
import { ActivityPhotosService } from './activity-photos.service';
import { ActivityPhoto } from './activity-photo.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityPhoto, Horse, HorseUser]),
    MulterModule.register({ storage: multer.memoryStorage() }),
    CloudinaryModule,
    NotificationsModule,
  ],
  controllers: [ActivityPhotosController],
  providers: [ActivityPhotosService],
})
export class ActivityPhotosModule {}
