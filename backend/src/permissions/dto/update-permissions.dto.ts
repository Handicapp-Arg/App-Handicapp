import { IsArray, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../auth/user.entity';

class PermissionItemDto {
  @IsNotEmpty()
  resource: string;

  @IsNotEmpty()
  action: string;
}

export class UpdatePermissionsDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[];
}
