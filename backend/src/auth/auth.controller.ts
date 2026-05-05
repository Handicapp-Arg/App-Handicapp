import {
  Controller,
  Post,
  Get,
  Patch,
  Query,
  Body,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from './user.entity';
import { PermissionsService } from '../permissions/permissions.service';

@ApiTags('auth')
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
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  login(@Body(ValidationPipe) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refreshTokens(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body('refreshToken') token: string) {
    return this.authService.revokeRefreshToken(token);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body(ValidationPipe) dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body(ValidationPipe) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
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

  @Get('admin/overview')
  @UseGuards(AuthGuard('jwt'))
  getAdminOverview(
    @GetUser() user: User,
    @Query(new ValidationPipe({ transform: true })) query: AdminQueryDto,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.authService.getAdminOverview(query);
  }

  @Get('admin/horses')
  @UseGuards(AuthGuard('jwt'))
  getAdminHorses(
    @GetUser() user: User,
    @Query(new ValidationPipe({ transform: true })) query: AdminQueryDto,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.authService.getAdminHorses(query);
  }

  @Get('admin/stats')
  @UseGuards(AuthGuard('jwt'))
  getAdminStats(@GetUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.authService.getAdminStats();
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
