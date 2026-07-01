import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Horse } from '../horses/horse.entity';
import { MedicalRecord } from '../medical/medical-record.entity';
import { Bill } from '../billing/bill.entity';
import { ServiceAppointment } from '../agenda/service-appointment.entity';
import { Event } from '../events/event.entity';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horse, MedicalRecord, Bill, ServiceAppointment, Event]),
    PlansModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
