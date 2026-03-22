import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsService } from './permissions.service';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { RoleName } from '../roles/role.entity';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'))
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll(@GetUser() user: User) {
    this.assertAdmin(user);
    return this.permissionsService.findAll();
  }

  @Put()
  update(
    @Body(ValidationPipe) dto: UpdatePermissionsDto,
    @GetUser() user: User,
  ) {
    this.assertAdmin(user);
    return this.permissionsService.updateRolePermissions(
      dto.role,
      dto.permissions,
    );
  }

  private assertAdmin(user: User): void {
    if (user.role.name !== RoleName.ADMIN) {
      throw new ForbiddenException('Solo el admin puede gestionar permisos');
    }
  }
}
