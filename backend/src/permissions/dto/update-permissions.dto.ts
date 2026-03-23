import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionItemDto {
  @IsNotEmpty()
  resource: string;

  @IsNotEmpty()
  action: string;
}

export class UpdatePermissionsDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[];
}
