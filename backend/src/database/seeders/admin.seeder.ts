import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../auth/user.entity';
import { RolesService } from '../../roles/roles.service';
import { RoleName } from '../../roles/role.entity';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  private readonly ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@handicapp.com';
  private readonly ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
  private readonly ADMIN_NAME = process.env.ADMIN_NAME || 'Administrador';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  private async seed(): Promise<void> {
    const exists = await this.userRepository.findOne({
      where: { email: this.ADMIN_EMAIL },
    });

    if (exists) return;

    const role = await this.rolesService.findByName(RoleName.ADMIN);
    const hashedPassword = await bcrypt.hash(this.ADMIN_PASSWORD, 10);

    const admin = this.userRepository.create({
      email: this.ADMIN_EMAIL,
      name: this.ADMIN_NAME,
      password: hashedPassword,
      role_id: role.id,
    });

    await this.userRepository.save(admin);
    this.logger.log(`Admin creado: ${this.ADMIN_EMAIL}`);
  }
}
