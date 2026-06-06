import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, Unique,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { FeedPost } from './feed-post.entity';

@Entity('feed_likes')
@Unique(['post_id', 'user_id'])
export class FeedLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  post_id: string;

  @ManyToOne(() => FeedPost, (p) => p.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: FeedPost;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
