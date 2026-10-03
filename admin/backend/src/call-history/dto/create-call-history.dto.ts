import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCallHistoryDto {
  @IsString() @IsNotEmpty() roomId: string;
  @IsString() @IsOptional() jobId?: string;
  @IsString() @IsOptional() participantIdentity?: string;
}
