import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

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

  @MinLength(6)
  newPassword: string;
}
