import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Permission } from './permission.entity';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../roles/role.entity';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private cache = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly dataSource: DataSource,
    private readonly rolesService: RolesService,
  ) {}

  async onModuleInit() {
    await this.seed();
    await this.reloadCache();
  }

  hasPermission(roleName: string, resource: string, action: string): boolean {
    const perms = this.cache.get(roleName);
    if (!perms) return false;
    return perms.has(`${resource}:${action}`);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({
      relations: ['role'],
      order: { role_id: 'ASC', resource: 'ASC', action: 'ASC' },
    });
  }

  async findByRoleName(roleName: string): Promise<Permission[]> {
    const role = await this.rolesService.findByName(roleName);
    return this.permissionRepository.find({
      where: { role_id: role.id },
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async updateRolePermissions(
    roleName: string,
    permissions: { resource: string; action: string }[],
  ): Promise<Permission[]> {
    const role = await this.rolesService.findByName(roleName);

    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.delete(Permission, { role_id: role.id });

      const entities = permissions.map((p) =>
        manager.create(Permission, { role_id: role.id, ...p }),
      );

      return manager.save(entities);
    });

    await this.reloadCache();
    return saved;
  }

  async reloadCache(): Promise<void> {
    const all = await this.permissionRepository.find({ relations: ['role'] });
    this.cache.clear();

    for (const perm of all) {
      const roleName = perm.role.name;
      if (!this.cache.has(roleName)) {
        this.cache.set(roleName, new Set());
      }
      this.cache.get(roleName)!.add(`${perm.resource}:${perm.action}`);
    }
  }

  private async seed(): Promise<void> {
    const count = await this.permissionRepository.count();
    if (count > 0) return;

    const roles = await this.rolesService.findAll();
    const roleMap = new Map(roles.map((r) => [r.name, r.id]));

    const resources = ['horses', 'events'];
    const actions = ['create', 'read', 'update', 'delete'];

    const permissions: Partial<Permission>[] = [];

    const adminId = roleMap.get(RoleName.ADMIN)!;
    const propietarioId = roleMap.get(RoleName.PROPIETARIO)!;
    const establecimientoId = roleMap.get(RoleName.ESTABLECIMIENTO)!;

    // Admin: todo
    for (const resource of resources) {
      for (const action of actions) {
        permissions.push({ role_id: adminId, resource, action });
      }
    }

    // Propietario: CRUD horses + create/read events
    for (const action of actions) {
      permissions.push({ role_id: propietarioId, resource: 'horses', action });
    }
    permissions.push({ role_id: propietarioId, resource: 'events', action: 'create' });
    permissions.push({ role_id: propietarioId, resource: 'events', action: 'read' });

    // Establecimiento: read horses + create/read events
    permissions.push({ role_id: establecimientoId, resource: 'horses', action: 'read' });
    permissions.push({ role_id: establecimientoId, resource: 'events', action: 'create' });
    permissions.push({ role_id: establecimientoId, resource: 'events', action: 'read' });

    await this.permissionRepository.save(
      permissions.map((p) => this.permissionRepository.create(p)),
    );
  }
}
