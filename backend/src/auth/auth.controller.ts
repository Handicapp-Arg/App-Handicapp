import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from './user.entity';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('register')
  register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body(ValidationPipe) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@GetUser() user: User) {
    const perms = await this.permissionsService.findByRoleName(user.role.name);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: perms.map((p) => `${p.resource}:${p.action}`),
    };
  }
}
