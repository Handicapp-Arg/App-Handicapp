import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@Controller('events')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequirePermission('events', 'create')
  @UseInterceptors(FilesInterceptor('photos', 10))
  create(
    @Body(ValidationPipe) dto: CreateEventDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: User,
  ) {
    return this.eventsService.create(dto, user, files);
  }

  @Get('all')
  @RequirePermission('events', 'read')
  findAll(@GetUser() user: User) {
    return this.eventsService.findAllByUser(user);
  }

  @Get('horse/:horseId')
  @RequirePermission('events', 'read')
  findByHorse(
    @Param('horseId') horseId: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.findByHorse(horseId, user);
  }

  @Get(':id')
  @RequirePermission('events', 'read')
  findOne(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.findOne(id, user);
  }
}
