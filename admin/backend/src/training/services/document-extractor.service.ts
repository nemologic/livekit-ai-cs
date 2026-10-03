import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface ExtractedDocument {
  text: string;
  filename: string;
  mimeType: string;
  characterCount: number;
}

@Injectable()
export class DocumentExtractorService {
  private readonly logger = new Logger(DocumentExtractorService.name);

  private readonly SUPPORTED_MIMES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]);

  async extract(file: Express.Multer.File): Promise<ExtractedDocument> {
    if (!this.SUPPORTED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `지원하지 않는 파일 형식입니다. PDF, DOCX, TXT만 가능합니다. (받은 형식: ${file.mimetype})`,
      );
    }

    let text: string;

    try {
      if (file.mimetype === 'application/pdf') {
        text = await this.extractPdf(file.buffer);
      } else if (
        file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await this.extractDocx(file.buffer);
      } else {
        text = file.buffer.toString('utf-8');
      }
    } catch (error) {
      this.logger.error(`파일 추출 실패: ${file.originalname}`, error.message);
      throw new BadRequestException(`파일 텍스트 추출에 실패했습니다: ${error.message}`);
    }

    const cleaned = this.cleanText(text);

    return {
      text: cleaned,
      filename: file.originalname,
      mimeType: file.mimetype,
      characterCount: cleaned.length,
    };
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
