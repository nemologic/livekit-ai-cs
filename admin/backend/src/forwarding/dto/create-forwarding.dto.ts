import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateForwardingDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() phoneNumber?: string;
  @IsString() @IsOptional() sipUri?: string;
  @IsEnum(['always', 'no_answer', 'busy']) @IsOptional() condition?: string;
  @IsBoolean() @IsOptional() enabled?: boolean;
}
