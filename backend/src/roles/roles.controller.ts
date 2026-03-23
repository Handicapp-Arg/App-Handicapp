import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(
    @Body(ValidationPipe) dto: CreateRoleDto,
    @GetUser() user: User,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.rolesService.create(dto.name);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @GetUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.rolesService.remove(id);
  }
}
