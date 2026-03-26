import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotificationSetting } from './notification-setting.entity';
import { EventType } from '../events/event.entity';

@Injectable()
export class NotificationSettingsService implements OnModuleInit {
  private cache = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(NotificationSetting)
    private readonly repo: Repository<NotificationSetting>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seed();
    await this.reloadCache();
  }

  shouldNotify(role: string, eventType: string): boolean {
    const types = this.cache.get(role);
    return !!types && types.has(eventType);
  }

  async findAll(): Promise<NotificationSetting[]> {
    return this.repo.find({ order: { role: 'ASC', event_type: 'ASC' } });
  }

  async updateRole(
    role: string,
    eventTypes: string[],
  ): Promise<NotificationSetting[]> {
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.delete(NotificationSetting, { role });
      const entities = eventTypes.map((event_type) =>
        manager.create(NotificationSetting, { role, event_type }),
      );
      return manager.save(entities);
    });
    await this.reloadCache();
    return saved;
  }

  async deleteByRole(role: string): Promise<void> {
    await this.repo.delete({ role });
    await this.reloadCache();
  }

  private async reloadCache(): Promise<void> {
    const all = await this.repo.find();
    this.cache.clear();
    for (const s of all) {
      if (!this.cache.has(s.role)) this.cache.set(s.role, new Set());
      this.cache.get(s.role)!.add(s.event_type);
    }
  }

  private async seed(): Promise<void> {
    const count = await this.repo.count();
    if (count > 0) return;

    const allTypes = Object.values(EventType);
    const defaultRoles = ['propietario', 'establecimiento'];
    const settings: Partial<NotificationSetting>[] = [];

    for (const role of defaultRoles) {
      for (const event_type of allTypes) {
        settings.push({ role, event_type });
      }
    }

    await this.repo.save(settings.map((s) => this.repo.create(s)));
  }
}
