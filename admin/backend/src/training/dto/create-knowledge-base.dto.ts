import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsEnum(['company_info', 'faq', 'scenario', 'prohibited']) type: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() content: string;
  @IsBoolean() @IsOptional() enabled?: boolean;
  @IsNumber() @IsOptional() sortOrder?: number;
}
