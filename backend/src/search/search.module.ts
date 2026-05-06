import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { Event } from '../events/event.entity';
import { MedicalRecord } from '../medical/medical-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Horse, HorseUser, Event, MedicalRecord])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
