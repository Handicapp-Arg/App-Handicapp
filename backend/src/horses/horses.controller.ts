import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HorsesService } from './horses.service';
import { CreateHorseDto } from './dto/create-horse.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@Controller('horses')
@UseGuards(AuthGuard('jwt'))
export class HorsesController {
  constructor(private readonly horsesService: HorsesService) {}

  @Post()
  create(
    @Body(ValidationPipe) dto: CreateHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.create(dto, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.horsesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.findOne(id, user);
  }
}
