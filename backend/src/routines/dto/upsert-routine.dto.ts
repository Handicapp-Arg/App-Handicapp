import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertRoutineDto {
  @IsDateString()
  date: string;

  @IsOptional() @IsBoolean() morning_feed?: boolean;
  @IsOptional() @IsBoolean() afternoon_feed?: boolean;
  @IsOptional() @IsBoolean() evening_feed?: boolean;
  @IsOptional() @IsBoolean() water_ok?: boolean;
  @IsOptional() @IsBoolean() paddock?: boolean;
  @IsOptional() @IsBoolean() trained?: boolean;
  @IsOptional() @IsBoolean() health_check?: boolean;
  @IsOptional() @IsBoolean() box_cleaned?: boolean;
  @IsOptional() @IsBoolean() groomed?: boolean;
  @IsOptional() @IsString() observations?: string;
}
