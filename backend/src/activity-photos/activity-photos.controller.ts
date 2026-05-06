import {
  Controller, Get, Post, Delete,
  Param, Body, UseGuards, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityPhotosService } from './activity-photos.service';
import { ActivityPhotoType } from './activity-photo.entity';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('activity-photos')
@ApiBearerAuth()
@Controller('horses/:horseId/activity-photos')
@UseGuards(AuthGuard('jwt'))
export class ActivityPhotosController {
  constructor(private readonly service: ActivityPhotosService) {}

  @Get()
  findAll(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.service.findByHorse(horseId, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 15 * 1024 * 1024 } }))
  upload(
    @Param('horseId') horseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('activity_type') activityType: ActivityPhotoType = ActivityPhotoType.OTHER,
    @Body('caption') caption: string | undefined,
    @GetUser() user: User,
  ) {
    return this.service.upload(horseId, file, activityType, caption, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.service.remove(id, user);
  }
}
