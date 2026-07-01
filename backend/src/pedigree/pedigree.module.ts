import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedigreeController } from './pedigree.controller';
import { PedigreeService } from './pedigree.service';
import { PedigreeScrapingService } from './pedigree-scraping.service';
import { PedigreeBootstrapService } from './pedigree-bootstrap.service';
import { Pedigree, PedigreeValidation, PedigreeDocument } from './entities/pedigree.entity';
import { Horse } from '../horses/horse.entity';
import { HorseUser } from '../horses/horse-user.entity';
import { HorseRecordsModule } from '../horse-records/horse-records.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedigree, PedigreeValidation, PedigreeDocument, Horse, HorseUser]),
    HorseRecordsModule,
  ],
  controllers: [PedigreeController],
  providers: [PedigreeService, PedigreeScrapingService, PedigreeBootstrapService],
  exports: [PedigreeService],
})
export class PedigreeModule {}
