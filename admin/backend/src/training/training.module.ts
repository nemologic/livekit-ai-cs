import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { KnowledgeBase } from './knowledge-base.entity';
import { AuthModule } from '../auth/auth.module';
import { DocumentExtractorService } from './services/document-extractor.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBase]), AuthModule],
  controllers: [TrainingController],
  providers: [TrainingService, DocumentExtractorService],
  exports: [TrainingService],
})
export class TrainingModule {}
