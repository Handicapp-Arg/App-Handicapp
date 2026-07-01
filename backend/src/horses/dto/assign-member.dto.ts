import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AssignMemberDto {
  @IsUUID()
  user_id: string;

  // Rol de la asignación dentro del caballo. Por defecto 'assignee'
  // (equipo operativo: jinete/peón/encargado).
  @IsOptional()
  @IsString()
  role?: string;
}
