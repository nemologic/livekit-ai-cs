import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallHistoryController } from './call-history.controller';
import { CallHistoryService } from './call-history.service';
import { CallHistory } from './call-history.entity';
import { AuthModule } from '../auth/auth.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CallHistory]), AuthModule],
  controllers: [CallHistoryController],
  providers: [CallHistoryService, ApiKeyGuard],
  exports: [CallHistoryService],
})
export class CallHistoryModule {}
