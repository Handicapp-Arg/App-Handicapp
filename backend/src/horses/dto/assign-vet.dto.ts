import { IsUUID } from 'class-validator';

export class AssignVetDto {
  @IsUUID()
  user_id: string;
}
