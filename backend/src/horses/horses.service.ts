import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Horse } from './horse.entity';
import { HorseUser } from './horse-user.entity';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { UpdateOwnershipDto } from './dto/update-ownership.dto';
import { User } from '../auth/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class HorsesService implements OnModuleInit {
  constructor(
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
    @InjectRepository(HorseUser)
    private readonly horseUserRepository: Repository<HorseUser>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    await this.backfillHorseUsers();
  }

  /**
   * One-time backfill: ensures every existing horse has its
   * owner and establishment in horse_users with correct roles.
   */
  private async backfillHorseUsers(): Promise<void> {
    const horses = await this.horseRepository.find();
    for (const horse of horses) {
      await this.syncHorseUsers(horse);
    }
  }

  async create(dto: CreateHorseDto, user: User): Promise<Horse> {
    let owner_id: string;
    let establishment_id: string | null = null;

    if (user.role === 'propietario') {
      owner_id = user.id;
      establishment_id = dto.establishment_id ?? null;
    } else if (user.role === 'establecimiento') {
      if (!dto.owner_id) {
        throw new BadRequestException(
          'El establecimiento debe indicar el owner_id del propietario',
        );
      }
      owner_id = dto.owner_id;
      establishment_id = user.id;
    } else {
      // Admin: requiere owner_id explícito
      if (!dto.owner_id) {
        throw new BadRequestException('El admin debe indicar el owner_id');
      }
      owner_id = dto.owner_id;
      establishment_id = dto.establishment_id ?? null;
    }

    const horse = this.horseRepository.create({
      name: dto.name,
      birth_date: dto.birth_date ?? null,
      owner_id,
      establishment_id,
      microchip: dto.microchip ?? null,
      breed_id: dto.breed_id ?? null,
      activity_id: dto.activity_id ?? null,
    });

    const saved = await this.horseRepository.save(horse);
    await this.syncHorseUsers(saved);
    return saved;
  }

  async findAll(user: User): Promise<Horse[]> {
    if (user.role === 'admin') {
      const horses = await this.horseRepository.find({
        relations: ['owner', 'establishment', 'horseUsers', 'breed', 'activity'],
      });
      return horses.map((h) => this.attachCoOwners(h));
    }

    if (user.role === 'propietario') {
      // Caballos donde es owner principal
      const ownedHorses = await this.horseRepository.find({
        where: { owner_id: user.id },
        relations: ['owner', 'establishment', 'horseUsers', 'breed', 'activity'],
      });

      // Caballos donde es co-propietario (pero no owner principal)
      const coOwnerEntries = await this.horseUserRepository.find({
        where: { user_id: user.id, role: 'owner' },
      });
      const coOwnedHorseIds = coOwnerEntries
        .map((hu) => hu.horse_id)
        .filter((hid) => !ownedHorses.some((h) => h.id === hid));

      let coOwnedHorses: Horse[] = [];
      if (coOwnedHorseIds.length) {
        coOwnedHorses = await this.horseRepository.find({
          where: { id: In(coOwnedHorseIds) },
          relations: ['owner', 'establishment', 'horseUsers', 'breed', 'activity'],
        });
      }

      return [...ownedHorses, ...coOwnedHorses].map((h) =>
        this.attachCoOwners(h),
      );
    }

    // establecimiento
    const horses = await this.horseRepository.find({
      where: { establishment_id: user.id },
      relations: ['owner', 'horseUsers', 'breed', 'activity'],
    });
    return horses.map((h) => this.attachCoOwners(h));
  }

  async findOne(id: string, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({
      where: { id },
      relations: ['owner', 'establishment', 'events', 'horseUsers', 'breed', 'activity'],
    });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    await this.assertAccess(horse, user);

    return this.attachCoOwners(horse);
  }

  async update(id: string, dto: UpdateHorseDto, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    await this.assertAccess(horse, user);

    Object.assign(horse, dto);
    const saved = await this.horseRepository.save(horse);

    // Re-sync if owner or establishment changed
    if (dto.establishment_id !== undefined) {
      await this.syncHorseUsers(saved);
    }

    return saved;
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File,
    user: User,
  ): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    // Eliminar imagen anterior si existe
    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    const result = await this.cloudinaryService.upload(file);
    horse.image_url = result.secure_url;
    horse.image_public_id = result.public_id;

    return this.horseRepository.save(horse);
  }

  async removeImage(id: string, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    horse.image_url = null;
    horse.image_public_id = null;

    return this.horseRepository.save(horse);
  }

  async remove(id: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id } });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    await this.assertAccess(horse, user);

    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    await this.horseRepository.remove(horse);
    // horse_users se borran por CASCADE
  }

  // ── Ownership (tenencia) ──────────────────────────────────

  async getOwnership(
    horseId: string,
    user: User,
  ): Promise<HorseUser[]> {
    const horse = await this.horseRepository.findOne({
      where: { id: horseId },
    });
    if (!horse) throw new NotFoundException('Caballo no encontrado');
    await this.assertAccess(horse, user);

    return this.horseUserRepository.find({
      where: { horse_id: horseId, role: 'owner' },
    });
  }

  async updateOwnership(
    horseId: string,
    dto: UpdateOwnershipDto,
    user: User,
  ): Promise<HorseUser[]> {
    const horse = await this.horseRepository.findOne({
      where: { id: horseId },
    });
    if (!horse) throw new NotFoundException('Caballo no encontrado');

    // Solo el owner principal o admin pueden gestionar tenencia
    if (user.role !== 'admin' && horse.owner_id !== user.id) {
      throw new ForbiddenException(
        'Solo el propietario principal puede gestionar la tenencia',
      );
    }

    // Validar que el owner principal esté incluido
    if (!dto.owners.some((o) => o.user_id === horse.owner_id)) {
      throw new BadRequestException(
        'El propietario principal debe estar incluido en la tenencia',
      );
    }

    // Validar suma = 100
    const total = dto.owners.reduce((sum, o) => sum + o.percentage, 0);
    if (total !== 100) {
      throw new BadRequestException(
        `Los porcentajes deben sumar 100% (actual: ${total}%)`,
      );
    }

    // Verificar que no haya user_ids duplicados
    const uniqueIds = new Set(dto.owners.map((o) => o.user_id));
    if (uniqueIds.size !== dto.owners.length) {
      throw new BadRequestException('No puede haber propietarios duplicados');
    }

    // Eliminar registros de ownership actuales
    await this.horseUserRepository.delete({
      horse_id: horseId,
      role: 'owner',
    });

    // Crear nuevos registros de ownership
    const newEntries = dto.owners.map((o) =>
      this.horseUserRepository.create({
        horse_id: horseId,
        user_id: o.user_id,
        percentage: o.percentage,
        role: 'owner',
      }),
    );

    await this.horseUserRepository.save(newEntries);

    // Asegurar que los co-propietarios también tengan acceso
    // (ya están en horse_users con role='owner', no necesitan 'access' duplicado)

    return this.horseUserRepository.find({
      where: { horse_id: horseId, role: 'owner' },
    });
  }

  // ── Private helpers ───────────────────────────────────────

  /**
   * Syncs the horse_users table with owner_id and establishment_id.
   * Keeps manually-added users (other roles) intact.
   */
  private async syncHorseUsers(horse: Horse): Promise<void> {
    const existing = await this.horseUserRepository.find({
      where: { horse_id: horse.id },
    });

    const existingByUserId = new Map(existing.map((hu) => [hu.user_id, hu]));

    // Ensure owner has an 'owner' role entry
    const ownerEntry = existingByUserId.get(horse.owner_id);
    if (!ownerEntry) {
      // Check if any ownership entries exist for this horse
      const hasOwnership = existing.some((hu) => hu.role === 'owner');
      await this.horseUserRepository.save(
        this.horseUserRepository.create({
          horse_id: horse.id,
          user_id: horse.owner_id,
          role: 'owner',
          percentage: hasOwnership ? null : 100,
        }),
      );
    } else if (ownerEntry.role !== 'owner') {
      // Upgrade existing access entry to owner
      const hasOtherOwners = existing.some(
        (hu) => hu.role === 'owner' && hu.user_id !== horse.owner_id,
      );
      ownerEntry.role = 'owner';
      if (!hasOtherOwners) ownerEntry.percentage = 100;
      await this.horseUserRepository.save(ownerEntry);
    }

    // Ensure establishment has an 'access' entry
    if (horse.establishment_id) {
      const estEntry = existingByUserId.get(horse.establishment_id);
      if (!estEntry) {
        await this.horseUserRepository.save(
          this.horseUserRepository.create({
            horse_id: horse.id,
            user_id: horse.establishment_id,
            role: 'access',
            percentage: null,
          }),
        );
      }
    }
  }

  private async assertAccess(horse: Horse, user: User): Promise<void> {
    if (user.role === 'admin') return;

    if (
      user.role === 'propietario' &&
      horse.owner_id === user.id
    ) return;

    if (
      user.role === 'establecimiento' &&
      horse.establishment_id === user.id
    ) return;

    // Check if user is a co-owner
    const coOwner = await this.horseUserRepository.findOne({
      where: { horse_id: horse.id, user_id: user.id, role: 'owner' },
    });
    if (coOwner) return;

    throw new ForbiddenException('No tenés acceso a este caballo');
  }

  private attachCoOwners(horse: Horse): Horse {
    if (horse.horseUsers) {
      (horse as any).co_owners = horse.horseUsers
        .filter((hu) => hu.role === 'owner')
        .map((hu) => ({
          id: hu.id,
          user_id: hu.user_id,
          percentage: hu.percentage ? Number(hu.percentage) : null,
          user: hu.user
            ? { id: hu.user.id, name: hu.user.name, email: hu.user.email }
            : undefined,
        }));
      delete (horse as any).horseUsers;
    }
    return horse;
  }
}
