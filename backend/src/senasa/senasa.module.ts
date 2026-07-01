import { Module } from '@nestjs/common';
import { SenasaService } from './senasa.service';

@Module({
  providers: [SenasaService],
  exports: [SenasaService],
})
export class SenasaModule {}
