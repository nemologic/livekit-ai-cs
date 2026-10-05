import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateVoiceProfileDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() voiceId: string;
  @IsString() @IsOptional() model?: string;
  @IsNumber() @Min(0.5) @Max(2) @IsOptional() speed?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() variation?: number;
}
