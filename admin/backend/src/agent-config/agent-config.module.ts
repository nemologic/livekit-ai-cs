import { Module } from '@nestjs/common';
import { AgentConfigController } from './agent-config.controller';
import { AgentConfigService } from './agent-config.service';
import { SettingsModule } from '../settings/settings.module';
import { TrainingModule } from '../training/training.module';

@Module({
  imports: [SettingsModule, TrainingModule],
  controllers: [AgentConfigController],
  providers: [AgentConfigService],
})
export class AgentConfigModule {}
