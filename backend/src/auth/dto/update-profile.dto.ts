import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { IsStrongPassword } from './password.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNotEmpty()
  name?: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
