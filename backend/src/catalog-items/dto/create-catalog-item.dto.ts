import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateCatalogItemDto {
  @IsIn(['breed', 'activity'])
  type: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
