import {
  Controller,
  Post,
  Get,
  Patch,
  Query,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
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
    const perms = await this.permissionsService.findByRole(user.role);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: perms.map((p) => `${p.resource}:${p.action}`),
    };
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'))
  findUsersByRole(@Query('role') role: string) {
    return this.authService.findByRole(role);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Body(ValidationPipe) dto: UpdateProfileDto,
    @GetUser() user: User,
  ) {
    const updated = await this.authService.updateProfile(user, dto);
    return { id: updated.id, email: updated.email, name: updated.name };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(
    @Body(ValidationPipe) dto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.authService.changePassword(user, dto);
  }
}
