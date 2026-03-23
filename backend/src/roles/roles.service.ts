import {
  Injectable,
  OnModuleInit,
  Inject,
  forwardRef,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<Role> {
    const exists = await this.roleRepository.findOne({ where: { name } });
    if (exists) {
      throw new ConflictException(`El rol "${name}" ya existe`);
    }
    return this.roleRepository.save(this.roleRepository.create({ name }));
  }

  async remove(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new BadRequestException('Rol no encontrado');
    if (role.name === 'admin') {
      throw new BadRequestException('No se puede eliminar el rol admin');
    }
    await this.permissionsService.deleteByRole(role.name);
    await this.roleRepository.remove(role);
  }

  async exists(name: string): Promise<boolean> {
    const count = await this.roleRepository.count({ where: { name } });
    return count > 0;
  }

  private async seed(): Promise<void> {
    const count = await this.roleRepository.count();
    if (count > 0) return;

    const defaults = ['admin', 'propietario', 'establecimiento'];
    for (const name of defaults) {
      await this.roleRepository.save(this.roleRepository.create({ name }));
    }
  }
}
