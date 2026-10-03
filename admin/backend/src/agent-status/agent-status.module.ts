import { Module } from '@nestjs/common';
import { AgentStatusController } from './agent-status.controller';
import { AgentStatusService } from './agent-status.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AgentStatusController],
  providers: [AgentStatusService],
})
export class AgentStatusModule {}
