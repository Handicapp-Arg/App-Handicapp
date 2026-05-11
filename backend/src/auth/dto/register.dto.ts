import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from './password.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}
