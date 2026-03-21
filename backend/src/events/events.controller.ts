import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(
    @Body(ValidationPipe) dto: CreateEventDto,
    @GetUser() user: User,
  ) {
    return this.eventsService.create(dto, user);
  }

  @Get('horse/:horseId')
  findByHorse(
    @Param('horseId') horseId: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.findByHorse(horseId, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.findOne(id, user);
  }
}
