import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Organization } from '../organizations/organization.entity';
import {
  OrganizationMember,
  OrgMemberRole,
} from '../organizations/organization-member.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';

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
  // ── Roles operativos (brazo derecho del establecimiento) ──
  // El rol de plataforma (User.role) es el eje que decide lo que ve el usuario
  // (sidebar + permisos + JWT). Estos tres valores ya existen en la tabla `roles`
  // y en el seed de permisos, por eso se crean directamente con ese role.
  { email: 'encargado@handicapp.com',     name: 'Carlos Encargado',      role: 'encargado' },
  { email: 'jinete@handicapp.com',        name: 'Diego Jinete',          role: 'jinete' },
  { email: 'peon@handicapp.com',          name: 'Ramón Peón',            role: 'peon' },
];

// Usuarios operativos → su rol dentro de la organización de prueba.
const OPERATIONAL_MEMBERS: { email: string; roleInOrg: OrgMemberRole }[] = [
  { email: 'encargado@handicapp.com', roleInOrg: 'encargado' },
  { email: 'jinete@handicapp.com',    roleInOrg: 'jinete' },
  { email: 'peon@handicapp.com',      roleInOrg: 'peon' },
];

const DEV_PASSWORD = 'handicapp2026';

/**
 * Crea usuarios de prueba al iniciar el backend en development.
 * Idempotente — solo crea/asigna lo que no existe.
 * No corre en producción (NODE_ENV === 'production').
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember) private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Horse) private readonly horseRepo: Repository<Horse>,
    @InjectRepository(HorseUser) private readonly horseUserRepo: Repository<HorseUser>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    if (process.env.SKIP_DEV_SEED === 'true') return;

    try {
      await this.seed();
      await this.seedOperationalData();
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

  /**
   * Asigna DATOS a los usuarios operativos (encargado/jinete/peón) para poder
   * validar sus pantallas: membresía en la organización del establecimiento de
   * prueba + 2-3 caballos asignados (role `assignee`). Todo idempotente.
   */
  private async seedOperationalData(): Promise<void> {
    // 1) Establecimiento de prueba y su organización.
    const establishment = await this.userRepo.findOne({
      where: { email: 'establecimiento@handicapp.com' },
    });
    if (!establishment) {
      this.logger.warn('Seed operativo: no existe el establecimiento de prueba, se omite');
      return;
    }

    let org = await this.orgRepo.findOne({ where: { owner_id: establishment.id } });
    if (!org) {
      org = await this.orgRepo.save(this.orgRepo.create({
        name: 'Haras Los Pinos',
        owner_id: establishment.id,
        plan: 'pro',
        status: 'active',
      }));
      this.logger.log(`✓ Organización de prueba creada: ${org.name}`);
    }

    // 2) Caballos para asignar: preferí los de la org / establecimiento; si no hay,
    //    usá los primeros caballos de la DB (orden estable por fecha de creación).
    let horses = await this.horseRepo.find({
      where: [{ organization_id: org.id }, { establishment_id: establishment.id }],
      order: { created_at: 'ASC' },
      take: 3,
    });
    if (!horses.length) {
      horses = await this.horseRepo.find({ order: { created_at: 'ASC' }, take: 3 });
    }
    if (!horses.length) {
      this.logger.warn('Seed operativo: no hay caballos en la DB para asignar');
    }

    // 2b) Vincular esos caballos a la organización de prueba, para que el ENCARGADO
    //     (que supervisa por caballeriza) los vea en su panel. Idempotente.
    for (const horse of horses) {
      if (horse.organization_id !== org.id) {
        horse.organization_id = org.id;
        await this.horseRepo.save(horse);
      }
    }

    // 3) Por cada usuario operativo: membresía + caballos asignados (idempotente).
    for (const { email, roleInOrg } of OPERATIONAL_MEMBERS) {
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) continue;

      const member = await this.memberRepo.findOne({
        where: { organization_id: org.id, user_id: user.id },
      });
      if (!member) {
        await this.memberRepo.save(this.memberRepo.create({
          organization_id: org.id,
          user_id: user.id,
          role_in_org: roleInOrg,
        }));
        this.logger.log(`✓ Membresía: ${email} → ${org.name} (${roleInOrg})`);
      }

      for (const horse of horses) {
        const link = await this.horseUserRepo.findOne({
          where: { horse_id: horse.id, user_id: user.id },
        });
        if (!link) {
          await this.horseUserRepo.save(this.horseUserRepo.create({
            horse_id: horse.id,
            user_id: user.id,
            role: 'assignee',
          }));
        }
      }
      if (horses.length) {
        this.logger.log(`✓ ${email}: ${horses.length} caballo(s) asignado(s)`);
      }
    }
  }
}
