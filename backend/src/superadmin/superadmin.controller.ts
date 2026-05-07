import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ValidationPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SuperAdminService } from './superadmin.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

class CreateOrgDto {
  @IsString()
  name: string;

  @IsEmail()
  owner_email: string;

  @IsIn(['free', 'basic', 'pro', 'enterprise'])
  plan: 'free' | 'basic' | 'pro' | 'enterprise';

  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class SetPlanDto {
  @IsIn(['free', 'basic', 'pro', 'enterprise'])
  plan: 'free' | 'basic' | 'pro' | 'enterprise';

  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;
}

class SetStatusDto {
  @IsIn(['active', 'suspended', 'trial'])
  status: 'active' | 'suspended' | 'trial';
}

@ApiTags('superadmin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('metrics')
  metrics(@GetUser() user: User) {
    return this.service.getMetrics(user);
  }

  @Get('organizations')
  listOrgs(
    @GetUser() user: User,
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listOrganizations(user, { search, plan, status });
  }

  @Post('organizations')
  createOrg(@GetUser() user: User, @Body(ValidationPipe) dto: CreateOrgDto) {
    return this.service.createOrganization(user, dto);
  }

  @Patch('organizations/:id/plan')
  setPlan(@GetUser() user: User, @Param('id') id: string, @Body(ValidationPipe) dto: SetPlanDto) {
    return this.service.setOrganizationPlan(user, id, dto);
  }

  @Patch('organizations/:id/status')
  setStatus(@GetUser() user: User, @Param('id') id: string, @Body(ValidationPipe) dto: SetStatusDto) {
    return this.service.setOrganizationStatus(user, id, dto.status);
  }

  @Delete('organizations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeOrg(@GetUser() user: User, @Param('id') id: string) {
    return this.service.deleteOrganization(user, id);
  }
}
