import { Controller, Get, Post, Param, Body, UseGuards, ValidationPipe, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoutinesService } from './routines.service';
import { UpsertRoutineDto } from './dto/upsert-routine.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('routines')
@ApiBearerAuth()
@Controller('horses/:horseId/routines')
@UseGuards(AuthGuard('jwt'))
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  findByHorse(
    @Param('horseId') horseId: string,
    @GetUser() user: User,
    @Query('limit') limit?: string,
  ) {
    return this.routinesService.findByHorse(horseId, user, limit ? parseInt(limit) : 30);
  }

  @Post()
  upsert(
    @Param('horseId') horseId: string,
    @Body(ValidationPipe) dto: UpsertRoutineDto,
    @GetUser() user: User,
  ) {
    return this.routinesService.upsert(horseId, dto, user);
  }
}
