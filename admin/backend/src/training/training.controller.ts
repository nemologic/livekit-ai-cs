import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

const uploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('PDF, DOCX, TXT 파일만 업로드할 수 있습니다.'), false);
    }
  },
});

@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private trainingService: TrainingService) {}

  @Get('export/prompt')
  exportPrompt() {
    return this.trainingService.exportPrompt();
  }

  /** 파일 텍스트 추출만 (저장 안 함 — 미리보기용) */
  @Post('upload/parse')
  @UseInterceptors(uploadInterceptor)
  parseDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일을 첨부해주세요.');
    return this.trainingService.parseDocument(file);
  }

  /** 파일 업로드 + 지식 베이스 저장 */
  @Post('upload')
  @UseInterceptors(uploadInterceptor)
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) throw new BadRequestException('파일을 첨부해주세요.');
    return this.trainingService.createFromUpload(file, dto);
  }

  @Get()
  findAll(@Query('type') type?: string) {
    return this.trainingService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateKnowledgeBaseDto) {
    return this.trainingService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKnowledgeBaseDto) {
    return this.trainingService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.delete(id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.toggle(id);
  }
}
