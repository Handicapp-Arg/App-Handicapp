import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsArray()
  @IsString({ each: true })
  eventTypes: string[];
}
