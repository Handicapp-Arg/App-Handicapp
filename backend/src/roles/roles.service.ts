import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleName } from './role.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({ order: { name: 'ASC' } });
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { name } });
    if (!role) {
      throw new NotFoundException(`Rol "${name}" no encontrado`);
    }
    return role;
  }

  private async seed(): Promise<void> {
    const count = await this.roleRepository.count();
    if (count > 0) return;

    const roles = Object.values(RoleName).map((name) =>
      this.roleRepository.create({ name }),
    );

    await this.roleRepository.save(roles);
  }
}
