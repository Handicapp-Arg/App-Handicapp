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

@Module({
  imports: [
    TypeOrmModule.forFeature([HorseRecord, HorseOwnershipClaim]),
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
