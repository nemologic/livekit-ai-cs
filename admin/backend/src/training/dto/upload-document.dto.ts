import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력하세요.' })
  title: string;

  @IsEnum(['company_info', 'faq', 'scenario', 'prohibited'], {
    message: '유효한 분류를 선택하세요.',
  })
  type: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
