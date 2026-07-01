import { Controller, Get, Post, Patch, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
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

  // Catálogo de planes (todos los roles) — la UI filtra por el rol del usuario.
  @Get('catalog')
  catalog() {
    return this.plansService.listPlans();
  }

  @Post('activate-pro')
  activatePro(
    @GetUser() user: User,
    @Body('months') months?: number,
  ) {
    return this.plansService.activatePro(user.id, months ?? 1);
  }

  @Patch('admin/:userId')
  adminSetPlan(
    @Param('userId') userId: string,
    @Body('plan') plan: string,
    @Body('months') months: number,
    @GetUser() user: User,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.plansService.adminSetPlan(userId, plan, months);
  }

  @Get('admin/users')
  adminGetUsers(@GetUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.plansService.getUsersWithPlan();
  }
}
