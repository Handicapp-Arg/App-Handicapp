import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

interface SeedUser {
  email: string;
  name: string;
  role: string;
}

const DEV_USERS: SeedUser[] = [
  { email: 'admin@handicapp.com',         name: 'Alejo Admin',          role: 'admin' },
  { email: 'establecimiento@handicapp.com', name: 'Haras Los Pinos',     role: 'establecimiento' },
  { email: 'propietario@handicapp.com',   name: 'Juan Propietario',      role: 'propietario' },
  { email: 'propietario2@handicapp.com',  name: 'Maria Propietaria',     role: 'propietario' },
  { email: 'veterinario@handicapp.com',   name: 'Dr. Pablo Veterinario', role: 'veterinario' },
];

const DEV_PASSWORD = 'handicapp2026';

/**
 * Crea usuarios de prueba al iniciar el backend en development.
 * Idempotente — solo crea los que no existen.
 * No corre en producción (NODE_ENV === 'production').
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    if (process.env.SKIP_DEV_SEED === 'true') return;

    try {
      await this.seed();
    } catch (err) {
      this.logger.error('Dev seed falló', err as Error);
    }
  }

  private async seed(): Promise<void> {
    const existing = await this.userRepo.find({
      where: DEV_USERS.map((u) => ({ email: u.email })),
    });
    const existingEmails = new Set(existing.map((u) => u.email));

    const toCreate = DEV_USERS.filter((u) => !existingEmails.has(u.email));
    if (!toCreate.length) {
      this.logger.log('Usuarios de desarrollo ya existen');
      return;
    }

    const hash = await bcrypt.hash(DEV_PASSWORD, 10);
    for (const u of toCreate) {
      await this.userRepo.save(this.userRepo.create({
        email: u.email,
        name: u.name,
        role: u.role,
        password: hash,
        plan: u.role === 'establecimiento' ? 'pro' : 'free',
      }));
      this.logger.log(`✓ Usuario creado: ${u.email} (${u.role})`);
    }

    this.logger.log('═══════════════════════════════════════════');
    this.logger.log('Usuarios de desarrollo listos. Password: ' + DEV_PASSWORD);
    this.logger.log('═══════════════════════════════════════════');
  }
}
