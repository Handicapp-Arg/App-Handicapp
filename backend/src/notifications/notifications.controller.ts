import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { MarkReadDto } from './dto/mark-read.dto';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@GetUser() user: User) {
    return this.service.findByUser(user.id);
  }

  @Get('unread-count')
  async unreadCount(@GetUser() user: User) {
    const count = await this.service.countUnread(user.id);
    return { count };
  }

  @Patch('read')
  markRead(
    @Body(ValidationPipe) dto: MarkReadDto,
    @GetUser() user: User,
  ) {
    return this.service.markAsRead(user.id, dto.id);
  }
}
