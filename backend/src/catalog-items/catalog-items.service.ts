import {
  Injectable,
  OnModuleInit,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Injectable()
export class CatalogItemsService implements OnModuleInit {
  constructor(
    @InjectRepository(CatalogItem)
    private readonly repository: Repository<CatalogItem>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async findByType(type: string): Promise<CatalogItem[]> {
    return this.repository.find({
      where: { type },
      order: { name: 'ASC' },
    });
  }

  async create(type: string, name: string): Promise<CatalogItem> {
    const exists = await this.repository.findOne({ where: { type, name } });
    if (exists) {
      throw new ConflictException(`"${name}" ya existe en ${type}`);
    }
    return this.repository.save(this.repository.create({ type, name }));
  }

  async remove(id: string): Promise<void> {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item no encontrado');
    await this.repository.remove(item);
  }

  private async seed(): Promise<void> {
    const breeds = [
      'Pura Sangre de Carrera',
      'Polo Argentino',
      'Criollo',
      'Árabe',
      'Cuarto de Milla',
    ];

    const activities = [
      'Polo',
      'Turf',
      'Equitación',
      'Cría',
      'Recreativo',
    ];

    for (const [type, defaults] of [['breed', breeds], ['activity', activities]] as const) {
      const count = await this.repository.count({ where: { type } });
      if (count > 0) continue;
      for (const name of defaults) {
        await this.repository.save(this.repository.create({ type, name }));
      }
    }
  }
}
