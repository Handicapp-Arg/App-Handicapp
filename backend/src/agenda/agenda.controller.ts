import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ValidationPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('agenda')
@ApiBearerAuth()
@Controller('agenda')
@UseGuards(AuthGuard('jwt'))
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  findAll(@GetUser() user: User, @Query('upcoming') upcoming?: string) {
    return this.agendaService.findByUser(user, upcoming === 'true');
  }

  @Get('horse/:horseId')
  findByHorse(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.agendaService.findByHorse(horseId, user);
  }

  @Post()
  create(@Body(ValidationPipe) dto: CreateAppointmentDto, @GetUser() user: User) {
    return this.agendaService.create(dto, user);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @GetUser() user: User) {
    return this.agendaService.complete(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.agendaService.remove(id, user);
  }
}
