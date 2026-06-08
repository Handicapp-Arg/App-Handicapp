import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsQueryDto } from './dto/events-query.dto';
import { TrainingMetricsDto } from './dto/training-metrics.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequirePermission('events', 'create')
  @UseInterceptors(FilesInterceptor('photos', 10, {
    fileFilter: (_req, file, cb) => {
      const allowed = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;
      cb(null, allowed.test(file.mimetype));
    },
  }))
  create(
    @Body(ValidationPipe) dto: CreateEventDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: User,
  ) {
    return this.eventsService.create(dto, user, files);
  }

  @Post('bulk')
  @RequirePermission('events', 'create')
  createBulk(
    @Body(ValidationPipe) dto: CreateBulkEventDto,
    @GetUser() user: User,
  ) {
    return this.eventsService.createBulk(dto, user);
  }

  @Get('all')
  @RequirePermission('events', 'read')
  findAll(
    @GetUser() user: User,
    @Query(new ValidationPipe({ transform: true })) query: EventsQueryDto,
  ) {
    return this.eventsService.findAllByUser(user, query);
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

  @Patch(':id')
  @RequirePermission('events', 'update')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateEventDto,
    @GetUser() user: User,
  ) {
    return this.eventsService.update(id, dto, user);
  }

  @Get(':id/training-metrics')
  @RequirePermission('events', 'read')
  getTrainingMetrics(@Param('id') id: string, @GetUser() user: User) {
    return this.eventsService.getTrainingMetrics(id, user);
  }

  @Post(':id/training-metrics')
  @RequirePermission('events', 'update')
  upsertTrainingMetrics(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: TrainingMetricsDto,
    @GetUser() user: User,
  ) {
    return this.eventsService.upsertTrainingMetrics(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('events', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.remove(id, user);
  }

  @Post(':id/share')
  @UseGuards(AuthGuard('jwt'))
  shareToFeed(@Param('id') id: string, @GetUser() user: User) {
    return this.eventsService.shareToFeed(id, user);
  }

  @Get(':id/comments')
  @UseGuards(AuthGuard('jwt'))
  getComments(@Param('id') id: string, @GetUser() user: User) {
    return this.eventsService.getComments(id, user);
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard('jwt'))
  addComment(
    @Param('id') id: string,
    @Body('text') text: string,
    @GetUser() user: User,
  ) {
    return this.eventsService.addComment(id, text, user);
  }

  @Delete('comments/:commentId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(@Param('commentId') commentId: string, @GetUser() user: User) {
    return this.eventsService.deleteComment(commentId, user);
  }
}
