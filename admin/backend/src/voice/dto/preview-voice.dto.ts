import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class PreviewVoiceDto {
  @IsString() @IsNotEmpty() voiceId: string;
  @IsString() @IsOptional() text?: string;
  @IsNumber() @Min(0.5) @Max(2) @IsOptional() speed?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() variation?: number;
}
