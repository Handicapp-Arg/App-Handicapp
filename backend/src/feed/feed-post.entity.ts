import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Horse } from '../horses/horse.entity';
import { FeedLike } from './feed-like.entity';
import { FeedComment } from './feed-comment.entity';

export type PostType = 'general' | 'horse_update' | 'announcement';

@Entity('feed_posts')
export class FeedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  author_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column('uuid', { nullable: true })
  horse_id: string | null;

  @ManyToOne(() => Horse, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'horse_id' })
  horse: Horse | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: 'general' })
  type: PostType;

  @Column({ type: 'simple-array', nullable: true })
  image_urls: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  image_public_ids: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  video_urls: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  video_public_ids: string[] | null;

  @Column({ type: 'int', default: 0 })
  likes_count: number;

  @Column({ type: 'int', default: 0 })
  comments_count: number;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'boolean', default: false })
  is_hidden: boolean;

  @OneToMany(() => FeedLike, (l) => l.post, { cascade: true })
  likes: FeedLike[];

  @OneToMany(() => FeedComment, (c) => c.post, { cascade: true })
  comments: FeedComment[];

  // Populated manually in service (not a DB column)
  liked_by_me?: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;
}
