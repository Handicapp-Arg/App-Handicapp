import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horse } from './horse.entity';
import { HorseUser } from './horse-user.entity';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
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
   * owner and establishment in horse_users.
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
    });

    const saved = await this.horseRepository.save(horse);
    await this.syncHorseUsers(saved);
    return saved;
  }

  async findAll(user: User): Promise<Horse[]> {
    if (user.role === 'admin') {
      return this.horseRepository.find({
        relations: ['owner', 'establishment'],
      });
    }

    if (user.role === 'propietario') {
      return this.horseRepository.find({
        where: { owner_id: user.id },
        relations: ['establishment'],
      });
    }

    return this.horseRepository.find({
      where: { establishment_id: user.id },
      relations: ['owner'],
    });
  }

  async findOne(id: string, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({
      where: { id },
      relations: ['owner', 'establishment', 'events'],
    });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    this.assertAccess(horse, user);

    return horse;
  }

  async update(id: string, dto: UpdateHorseDto, user: User): Promise<Horse> {
    const horse = await this.horseRepository.findOne({ where: { id } });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    this.assertAccess(horse, user);

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
    this.assertAccess(horse, user);

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
    this.assertAccess(horse, user);

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

    this.assertAccess(horse, user);

    if (horse.image_public_id) {
      await this.cloudinaryService.delete(horse.image_public_id);
    }

    await this.horseRepository.remove(horse);
    // horse_users se borran por CASCADE
  }

  /**
   * Syncs the horse_users table with owner_id and establishment_id.
   * Keeps manually-added users (other roles) intact.
   */
  private async syncHorseUsers(horse: Horse): Promise<void> {
    // Get current auto-linked user IDs (owner + establishment)
    const autoIds = [horse.owner_id];
    if (horse.establishment_id) autoIds.push(horse.establishment_id);

    // Get existing horse_users for this horse
    const existing = await this.horseUserRepository.find({
      where: { horse_id: horse.id },
    });

    const existingUserIds = new Set(existing.map((hu) => hu.user_id));

    // Add missing auto-linked users
    const toAdd = autoIds.filter((id) => !existingUserIds.has(id));
    if (toAdd.length) {
      await this.horseUserRepository.save(
        toAdd.map((user_id) =>
          this.horseUserRepository.create({ horse_id: horse.id, user_id }),
        ),
      );
    }
  }

  private assertAccess(horse: Horse, user: User): void {
    if (user.role === 'admin') return;

    if (
      user.role === 'propietario' &&
      horse.owner_id === user.id
    ) return;

    if (
      user.role === 'establecimiento' &&
      horse.establishment_id === user.id
    ) return;

    throw new ForbiddenException('No tenés acceso a este caballo');
  }
}
