import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z_]+$/, {
    message: 'El nombre del rol solo puede contener letras minúsculas y guiones bajos',
  })
  name: string;
}
