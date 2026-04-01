import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogItemsService } from './catalog-items.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@Controller('catalog-items')
@UseGuards(AuthGuard('jwt'))
export class CatalogItemsController {
  constructor(private readonly service: CatalogItemsService) {}

  @Get()
  findByType(@Query('type') type: string) {
    return this.service.findByType(type);
  }

  @Post()
  create(
    @Body(ValidationPipe) dto: CreateCatalogItemDto,
    @GetUser() user: User,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.service.create(dto.type, dto.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.service.remove(id);
  }
}
