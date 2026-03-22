import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Permission } from './permission.entity';
import { UserRole } from '../auth/user.entity';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private cache = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seed();
    await this.reloadCache();
  }

  hasPermission(role: UserRole, resource: string, action: string): boolean {
    const key = role;
    const perms = this.cache.get(key);
    if (!perms) return false;
    return perms.has(`${resource}:${action}`);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { role: 'ASC', resource: 'ASC', action: 'ASC' },
    });
  }

  async findByRole(role: UserRole): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { role },
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async updateRolePermissions(
    role: UserRole,
    permissions: { resource: string; action: string }[],
  ): Promise<Permission[]> {
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.delete(Permission, { role });

      const entities = permissions.map((p) =>
        manager.create(Permission, { role, ...p }),
      );

      return manager.save(entities);
    });

    await this.reloadCache();
    return saved;
  }

  async reloadCache(): Promise<void> {
    const all = await this.permissionRepository.find();
    this.cache.clear();

    for (const perm of all) {
      if (!this.cache.has(perm.role)) {
        this.cache.set(perm.role, new Set());
      }
      this.cache.get(perm.role)!.add(`${perm.resource}:${perm.action}`);
    }
  }

  private async seed(): Promise<void> {
    const count = await this.permissionRepository.count();
    if (count > 0) return;

    const resources = ['horses', 'events'];
    const actions = ['create', 'read', 'update', 'delete'];

    const permissions: Partial<Permission>[] = [];

    // Admin: todo
    for (const resource of resources) {
      for (const action of actions) {
        permissions.push({ role: UserRole.ADMIN, resource, action });
      }
    }

    // Propietario: CRUD horses + create/read events
    for (const action of actions) {
      permissions.push({ role: UserRole.PROPIETARIO, resource: 'horses', action });
    }
    permissions.push({ role: UserRole.PROPIETARIO, resource: 'events', action: 'create' });
    permissions.push({ role: UserRole.PROPIETARIO, resource: 'events', action: 'read' });

    // Establecimiento: read horses + create/read events
    permissions.push({ role: UserRole.ESTABLECIMIENTO, resource: 'horses', action: 'read' });
    permissions.push({ role: UserRole.ESTABLECIMIENTO, resource: 'events', action: 'create' });
    permissions.push({ role: UserRole.ESTABLECIMIENTO, resource: 'events', action: 'read' });

    await this.permissionRepository.save(
      permissions.map((p) => this.permissionRepository.create(p)),
    );
  }
}
