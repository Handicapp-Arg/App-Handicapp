import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Permission } from './permission.entity';

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

  hasPermission(role: string, resource: string, action: string): boolean {
    const perms = this.cache.get(role);
    if (!perms) return false;
    return perms.has(`${resource}:${action}`);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { role: 'ASC', resource: 'ASC', action: 'ASC' },
    });
  }

  async findByRole(role: string): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { role },
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async updateRolePermissions(
    role: string,
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

  async deleteByRole(role: string): Promise<void> {
    await this.permissionRepository.delete({ role });
    await this.reloadCache();
  }

  private async seed(): Promise<void> {
    const desired: Partial<Permission>[] = [
      // Admin: CRUD completo
      ...['horses', 'events'].flatMap((resource) =>
        ['create', 'read', 'update', 'delete'].map((action) => ({
          role: 'admin',
          resource,
          action,
        })),
      ),
      // Propietario: CRUD horses + CRUD events propios
      ...['create', 'read', 'update', 'delete'].map((action) => ({
        role: 'propietario',
        resource: 'horses',
        action,
      })),
      ...['create', 'read', 'update', 'delete'].map((action) => ({
        role: 'propietario',
        resource: 'events',
        action,
      })),
      // Establecimiento: read horses + CRUD events propios
      { role: 'establecimiento', resource: 'horses', action: 'read' },
      ...['create', 'read', 'update', 'delete'].map((action) => ({
        role: 'establecimiento',
        resource: 'events',
        action,
      })),
      // Veterinario: read horses + create/read eventos de salud (sin update/delete)
      { role: 'veterinario', resource: 'horses', action: 'read' },
      { role: 'veterinario', resource: 'events', action: 'create' },
      { role: 'veterinario', resource: 'events', action: 'read' },
    ];

    // Upsert idempotente: inserta solo los que no existen
    for (const perm of desired) {
      const exists = await this.permissionRepository.findOne({
        where: { role: perm.role, resource: perm.resource, action: perm.action },
      });
      if (!exists) {
        await this.permissionRepository.save(
          this.permissionRepository.create(perm),
        );
      }
    }
  }
}
