import {
  Controller, Get, Post, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFiles, ValidationPipe,
  HttpCode, HttpStatus, Patch,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { FeedService } from './feed.service';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
@UseGuards(AuthGuard('jwt'))
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('media', 4, {
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      cb(null, file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')),
  }))
  create(
    @Body(new ValidationPipe({ transform: true })) dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @GetUser() user: User,
  ) {
    return this.feedService.create(dto, user, files ?? []);
  }

  @Get()
  findAll(
    @GetUser() user: User,
    @Query(new ValidationPipe({ transform: true })) query: FeedQueryDto,
  ) {
    return this.feedService.findAll(user, query);
  }

  @Get('admin/stats')
  adminStats(@GetUser() user: User) {
    if (user.role !== 'admin') {
      return { total: 0, hidden: 0, pinned: 0, today: 0 };
    }
    return this.feedService.adminStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.feedService.findOne(id, user);
  }

  @Post(':id/like')
  toggleLike(@Param('id') id: string, @GetUser() user: User) {
    return this.feedService.toggleLike(id, user);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.feedService.getComments(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @GetUser() user: User,
  ) {
    return this.feedService.addComment(id, content, user);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(@Param('commentId') cid: string, @GetUser() user: User) {
    return this.feedService.deleteComment(cid, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param('id') id: string, @GetUser() user: User) {
    return this.feedService.deletePost(id, user);
  }

  @Patch(':id/pin')
  togglePin(@Param('id') id: string, @GetUser() user: User) {
    return this.feedService.togglePin(id, user);
  }

  @Patch(':id/hide')
  toggleHide(@Param('id') id: string, @GetUser() user: User) {
    return this.feedService.toggleHide(id, user);
  }
}
