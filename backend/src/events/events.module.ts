import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './event.entity';
import { EventPhoto } from './event-photo.entity';
import { Horse } from '../horses/horse.entity';
import { AuthModule } from '../auth/auth.module';

const uploadDir = join(process.cwd(), 'uploads', 'events');
mkdirSync(uploadDir, { recursive: true });

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventPhoto, Horse]),
    MulterModule.register({
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const name = randomUUID() + extname(file.originalname);
          cb(null, name);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    AuthModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
