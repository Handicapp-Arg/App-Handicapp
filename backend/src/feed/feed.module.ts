import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedPost } from './feed-post.entity';
import { FeedLike } from './feed-like.entity';
import { FeedComment } from './feed-comment.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeedPost, FeedLike, FeedComment])],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
