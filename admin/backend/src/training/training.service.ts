import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase } from './knowledge-base.entity';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentExtractorService, ExtractedDocument } from './services/document-extractor.service';

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly knowledgeBaseRepo: Repository<KnowledgeBase>,
    private readonly documentExtractor: DocumentExtractorService,
  ) {}

  async findAll(type?: string): Promise<KnowledgeBase[]> {
    const where: any = {};
    if (type) where.type = type;
    return this.knowledgeBaseRepo.find({ where, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async findOne(id: number): Promise<KnowledgeBase> {
    const record = await this.knowledgeBaseRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`지식 베이스 항목 ID ${id}를 찾을 수 없습니다.`);
    }
    return record;
  }

  async create(data: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const record = this.knowledgeBaseRepo.create(data);
    return this.knowledgeBaseRepo.save(record);
  }

  async update(id: number, data: UpdateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const record = await this.findOne(id);
    Object.assign(record, data);
    return this.knowledgeBaseRepo.save(record);
  }

  async delete(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.knowledgeBaseRepo.remove(record);
  }

  async toggle(id: number): Promise<KnowledgeBase> {
    const record = await this.findOne(id);
    record.enabled = !record.enabled;
    return this.knowledgeBaseRepo.save(record);
  }

  async parseDocument(file: Express.Multer.File): Promise<ExtractedDocument> {
    return this.documentExtractor.extract(file);
  }

  async createFromUpload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<KnowledgeBase> {
    const extracted = await this.documentExtractor.extract(file);
    const record = this.knowledgeBaseRepo.create({
      type: dto.type,
      title: dto.title,
      content: extracted.text,
      enabled: dto.enabled ?? true,
      sourceFilename: extracted.filename,
    });
    return this.knowledgeBaseRepo.save(record);
  }

  async exportPrompt(): Promise<string> {
    const all = await this.knowledgeBaseRepo.find({
      where: { enabled: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const companyInfo = all.filter(r => r.type === 'company_info');
    const faqs = all.filter(r => r.type === 'faq');
    const scenarios = all.filter(r => r.type === 'scenario');
    const prohibited = all.filter(r => r.type === 'prohibited');

    const sections: string[] = [];

    if (companyInfo.length > 0) {
      sections.push('## 회사 정보');
      companyInfo.forEach(r => {
        sections.push(`### ${r.title}`);
        sections.push(r.content);
      });
    }

    if (faqs.length > 0) {
      sections.push('## 자주 묻는 질문 (FAQ)');
      faqs.forEach(r => {
        sections.push(`Q: ${r.title}`);
        sections.push(`A: ${r.content}`);
      });
    }

    if (scenarios.length > 0) {
      sections.push('## 상담 시나리오');
      scenarios.forEach(r => {
        sections.push(`### ${r.title}`);
        sections.push(r.content);
      });
    }

    if (prohibited.length > 0) {
      sections.push('## 금지 사항');
      prohibited.forEach(r => {
        sections.push(`- ${r.title}: ${r.content}`);
      });
    }

    return sections.join('\n\n');
  }
}
