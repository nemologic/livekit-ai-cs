import { IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class UpdateCallHistoryDto {
  @IsEnum(['active', 'completed', 'error']) @IsOptional() status?: string;
  @IsDateString() @IsOptional() endedAt?: string;
  @IsNumber() @IsOptional() durationSeconds?: number;
}
