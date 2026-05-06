import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalController } from './medical.controller';
import { MedicalService } from './medical.service';
import { MedicalRecord } from './medical-record.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord, Horse, HorseUser])],
  controllers: [MedicalController],
  providers: [MedicalService],
})
export class MedicalModule {}
