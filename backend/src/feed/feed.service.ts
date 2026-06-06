import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FeedPost } from './feed-post.entity';
import { FeedLike } from './feed-like.entity';
import { FeedComment } from './feed-comment.entity';
import { User } from '../auth/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(FeedPost) private posts: Repository<FeedPost>,
    @InjectRepository(FeedLike) private likes: Repository<FeedLike>,
    @InjectRepository(FeedComment) private comments: Repository<FeedComment>,
    private cloudinary: CloudinaryService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreatePostDto, user: User, files: Express.Multer.File[] = []) {
    if (dto.type === 'announcement' && user.role !== 'admin') {
      throw new ForbiddenException('Solo admins pueden publicar anuncios');
    }

    const post = this.posts.create({
      content: dto.content,
      author_id: user.id,
      horse_id: dto.horse_id ?? null,
      type: dto.type ?? 'general',
      is_pinned: dto.type === 'announcement',
    });

    if (files.length) {
      const images = files.filter((f) => f.mimetype.startsWith('image/'));
      const videos = files.filter((f) => f.mimetype.startsWith('video/'));

      if (images.length) {
        const uploads = await Promise.all(
          images.map((f) => this.cloudinary.upload(f, 'handicapp/feed')),
        );
        post.image_urls = uploads.map((u) => u.secure_url);
        post.image_public_ids = uploads.map((u) => u.public_id);
      }

      if (videos.length) {
        const uploads = await Promise.all(
          videos.map((f) => this.cloudinary.uploadVideo(f, 'handicapp/feed')),
        );
        post.video_urls = uploads.map((u) => u.secure_url);
        post.video_public_ids = uploads.map((u) => u.public_id);
      }
    }

    const saved = await this.posts.save(post);
    return this.findOne(saved.id, user);
  }

  async findAll(user: User, query: FeedQueryDto = {}) {
    const { page = 1, limit = 20, include_hidden, horse_id } = query;

    const qb = this.posts.createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .leftJoinAndSelect('p.horse', 'horse')
      .orderBy('p.is_pinned', 'DESC')
      .addOrderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (!include_hidden || user.role !== 'admin') {
      qb.andWhere('p.is_hidden = false');
    }

    if (horse_id) {
      qb.andWhere('p.horse_id = :horse_id', { horse_id });
    }

    const [data, total] = await qb.getManyAndCount();

    // Attach liked_by_me flag
    if (data.length) {
      const postIds = data.map((p) => p.id);
      const myLikes = await this.likes.find({
        where: postIds.map((id) => ({ post_id: id, user_id: user.id })),
      });
      const likedSet = new Set(myLikes.map((l) => l.post_id));
      data.forEach((p) => { p.liked_by_me = likedSet.has(p.id); });
    }

    return { data, total, page, limit };
  }

  async findOne(id: string, user: User) {
    const post = await this.posts.findOne({
      where: { id },
      relations: ['author', 'horse'],
    });
    if (!post) throw new NotFoundException('Post no encontrado');
    if (post.is_hidden && user.role !== 'admin' && post.author_id !== user.id) {
      throw new NotFoundException('Post no encontrado');
    }

    const like = await this.likes.findOne({ where: { post_id: id, user_id: user.id } });
    post.liked_by_me = !!like;
    return post;
  }

  async toggleLike(postId: string, user: User) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');

    const existing = await this.likes.findOne({ where: { post_id: postId, user_id: user.id } });

    await this.dataSource.transaction(async (em) => {
      if (existing) {
        await em.delete(FeedLike, existing.id);
        await em.decrement(FeedPost, { id: postId }, 'likes_count', 1);
      } else {
        await em.save(FeedLike, em.create(FeedLike, { post_id: postId, user_id: user.id }));
        await em.increment(FeedPost, { id: postId }, 'likes_count', 1);
      }
    });

    return { liked: !existing };
  }

  async getComments(postId: string) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');

    return this.comments.find({
      where: { post_id: postId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async addComment(postId: string, content: string, user: User) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');
    if (!content?.trim()) throw new ForbiddenException('El comentario no puede estar vacío');

    const comment = await this.comments.save(
      this.comments.create({ post_id: postId, user_id: user.id, content: content.trim() }),
    );

    await this.posts.increment({ id: postId }, 'comments_count', 1);
    return this.comments.findOne({ where: { id: comment.id }, relations: ['user'] });
  }

  async deleteComment(commentId: string, user: User) {
    const comment = await this.comments.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('No podés eliminar este comentario');
    }
    await this.comments.softDelete(commentId);
    await this.posts.decrement({ id: comment.post_id }, 'comments_count', 1);
  }

  async deletePost(postId: string, user: User) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');
    if (post.author_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('No podés eliminar este post');
    }

    if (post.image_public_ids?.length) {
      await Promise.allSettled(
        post.image_public_ids.map((id) => this.cloudinary.delete(id, 'image')),
      );
    }
    if (post.video_public_ids?.length) {
      await Promise.allSettled(
        post.video_public_ids.map((id) => this.cloudinary.delete(id, 'raw')),
      );
    }

    await this.posts.softDelete(postId);
  }

  async togglePin(postId: string, user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Solo admins pueden fijar posts');
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');
    post.is_pinned = !post.is_pinned;
    await this.posts.save(post);
    return { is_pinned: post.is_pinned };
  }

  async toggleHide(postId: string, user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Solo admins pueden ocultar posts');
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');
    post.is_hidden = !post.is_hidden;
    await this.posts.save(post);
    return { is_hidden: post.is_hidden };
  }

  async adminStats() {
    const total = await this.posts.count();
    const hidden = await this.posts.count({ where: { is_hidden: true } });
    const pinned = await this.posts.count({ where: { is_pinned: true } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.posts.createQueryBuilder('p')
      .where('p.created_at >= :today', { today })
      .getCount();
    return { total, hidden, pinned, today: todayCount };
  }
}
