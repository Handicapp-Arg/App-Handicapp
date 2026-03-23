import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horse } from './horse.entity';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { User } from '../auth/user.entity';

@Injectable()
export class HorsesService {
  constructor(
    @InjectRepository(Horse)
    private readonly horseRepository: Repository<Horse>,
  ) {}

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

    return this.horseRepository.save(horse);
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
    return this.horseRepository.save(horse);
  }

  async remove(id: string, user: User): Promise<void> {
    const horse = await this.horseRepository.findOne({ where: { id } });

    if (!horse) {
      throw new NotFoundException('Caballo no encontrado');
    }

    this.assertAccess(horse, user);

    await this.horseRepository.remove(horse);
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
