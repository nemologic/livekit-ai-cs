import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AgentConfigService } from './agent-config.service';

@UseGuards(ApiKeyGuard)
@Controller('agent-config')
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  /**
   * 에이전트가 세션 시작 시 호출하는 엔드포인트.
   * 시스템 프롬프트 + 지식 베이스 + LLM/TTS 설정을 한 번에 반환합니다.
   */
  @Get()
  getConfig() {
    return this.agentConfigService.buildAgentConfig();
  }
}
