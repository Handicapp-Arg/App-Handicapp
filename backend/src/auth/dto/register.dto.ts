import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  // Si viene, el usuario se registra aceptando una invitación a una organización:
  // el rol de plataforma se deriva del role_in_org de la invitación y se lo suma como miembro.
  @IsOptional()
  @IsString()
  invitation_token?: string;
}
