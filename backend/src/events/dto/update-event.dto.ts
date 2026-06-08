import { IsEnum, IsDateString, IsOptional, IsNumberString, IsNotEmpty, IsIn, IsBoolean } from 'class-validator';
import { EventType, ExpenseCategory } from '../event.entity';

export class UpdateEventDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsIn(['ARS', 'USD'])
  currency?: 'ARS' | 'USD';

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  expense_category?: ExpenseCategory;
}
