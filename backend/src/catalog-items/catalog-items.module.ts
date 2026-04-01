import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogItem } from './catalog-item.entity';
import { CatalogItemsService } from './catalog-items.service';
import { CatalogItemsController } from './catalog-items.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CatalogItem])],
  controllers: [CatalogItemsController],
  providers: [CatalogItemsService],
  exports: [CatalogItemsService],
})
export class CatalogItemsModule {}
