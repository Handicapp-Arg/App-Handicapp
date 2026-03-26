import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { EVENT_TYPES } from '../events/event-type.constants';

@Controller('notification-settings')
@UseGuards(AuthGuard('jwt'))
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get('event-types')
  getEventTypes(@GetUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return EVENT_TYPES;
  }

  @Get()
  findAll(@GetUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.service.findAll();
  }

  @Put()
  update(
    @Body(ValidationPipe) dto: UpdateNotificationSettingsDto,
    @GetUser() user: User,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.service.updateRole(dto.role, dto.eventTypes);
  }
}
