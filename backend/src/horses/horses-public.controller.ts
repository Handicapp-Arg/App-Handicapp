import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HorsesService } from './horses.service';

@ApiTags('horses-public')
@Controller('horses')
export class HorsesPublicController {
  constructor(private readonly horsesService: HorsesService) {}

  @Get('public/:publicToken')
  getPublicProfile(@Param('publicToken') publicToken: string) {
    return this.horsesService.getPublicProfile(publicToken);
  }
}
