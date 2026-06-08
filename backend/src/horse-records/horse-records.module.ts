import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HorseRecord } from './horse-record.entity';
import { HorseOwnershipClaim } from './horse-ownership-claim.entity';
import { HorseRecordsService } from './horse-records.service';
import { HorseRecordsController } from './horse-records.controller';
import { HorseRecordsScrapingService } from './horse-records-scraping.service';
import { HorseRecordsBootstrapService } from './horse-records-bootstrap.service';
import { PuppeteerScraperService } from './scrapers/puppeteer-scraper.service';
import { Horse } from '../horses/horse.entity';
import { CatalogItem } from '../catalog-items/catalog-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HorseRecord, HorseOwnershipClaim, Horse, CatalogItem]),
    ScheduleModule,
  ],
  providers: [
    PuppeteerScraperService,
    HorseRecordsService,
    HorseRecordsScrapingService,
    HorseRecordsBootstrapService,
  ],
  controllers: [HorseRecordsController],
  exports: [HorseRecordsService, HorseRecordsScrapingService],
})
export class HorseRecordsModule {}
