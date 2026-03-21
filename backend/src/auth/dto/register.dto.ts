import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { UserRole } from '../user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole, {
    message: 'role must be propietario or establecimiento',
  })
  role: UserRole;
}
