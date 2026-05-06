import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('status')
  getStatus(@GetUser() user: User) {
    return this.plansService.getPlanStatus(user);
  }

  @Post('activate-pro')
  activatePro(
    @GetUser() user: User,
    @Body('months') months?: number,
  ) {
    return this.plansService.activatePro(user.id, months ?? 1);
  }
}
