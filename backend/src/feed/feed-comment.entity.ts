import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { FeedPost } from './feed-post.entity';

@Entity('feed_comments')
export class FeedComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  post_id: string;

  @ManyToOne(() => FeedPost, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: FeedPost;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;
}
