import { IsUUID } from 'class-validator';

export class TransferHorseDto {
  @IsUUID()
  new_owner_id: string;
}
