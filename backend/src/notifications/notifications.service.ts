import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(data: {
    type: NotificationType;
    title: string;
    message: string;
    recipient_id: string;
    event_id?: string;
    actor_id?: string;
  }): Promise<Notification> {
    const notification = this.repo.create(data);
    return this.repo.save(notification);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { recipient_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({
      where: { recipient_id: userId, read: false },
    });
  }

  async markAsRead(userId: string, notificationId?: string): Promise<void> {
    if (notificationId) {
      await this.repo.update(
        { id: notificationId, recipient_id: userId },
        { read: true },
      );
    } else {
      await this.repo.update(
        { recipient_id: userId, read: false },
        { read: true },
      );
    }
  }
}
