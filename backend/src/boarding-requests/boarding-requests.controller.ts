import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ValidationPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { BoardingRequestsService } from './boarding-requests.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

class CreateBoardingRequestDto {
  @IsUUID()
  horse_id: string;

  @IsUUID()
  establishment_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

@ApiTags('boarding-requests')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('boarding-requests')
export class BoardingRequestsController {
  constructor(private readonly service: BoardingRequestsService) {}

  @Post()
  create(@Body(ValidationPipe) dto: CreateBoardingRequestDto, @GetUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  findMine(@GetUser() user: User) {
    return this.service.findMine(user);
  }

  @Patch(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('id') id: string, @GetUser() user: User) {
    return this.service.accept(id, user);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @GetUser() user: User) {
    return this.service.reject(id, user);
  }
}
