import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { Organization } from '../organizations/organization.entity';
import { Plan } from './plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Horse, Organization, Plan])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
