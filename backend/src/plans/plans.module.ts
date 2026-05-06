import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Horse])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
