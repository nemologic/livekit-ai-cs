import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateVoiceProfileDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() voiceId: string;
  @IsString() @IsOptional() model?: string;
  @IsNumber() @Min(0) @Max(1) @IsOptional() stability?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() similarityBoost?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() style?: number;
  @IsBoolean() @IsOptional() useSpeakerBoost?: boolean;
}
