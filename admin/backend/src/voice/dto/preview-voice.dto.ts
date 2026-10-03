import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class PreviewVoiceDto {
  @IsString() @IsNotEmpty() voiceId: string;
  @IsString() @IsOptional() text?: string;
  @IsNumber() @Min(0) @Max(1) @IsOptional() stability?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() similarityBoost?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() style?: number;
}
