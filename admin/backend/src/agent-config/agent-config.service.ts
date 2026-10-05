import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { TrainingService } from '../training/training.service';

export interface AgentConfig {
  systemPrompt: string;
  knowledgeBase: string;
  combinedInstructions: string;
  llmModel: string;
  llmBaseUrl: string;
  ttsVoiceId: string;
  ttsModel: string;
  ttsSpeed: number;
  ttsVariation: number;
  /** 통화 시간 제한(초). 0이면 제한 없음 */
  callTimeLimitSeconds: number;
  /** 종료 1분 전에 예고 멘트를 할지 */
  callTimeLimitWarning: boolean;
}

@Injectable()
export class AgentConfigService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly trainingService: TrainingService,
  ) {}

  async buildAgentConfig(): Promise<AgentConfig> {
    const [settings, knowledgeBase] = await Promise.all([
      this.settingsService.findAll(),
      this.trainingService.exportPrompt(),
    ]);

    const systemPrompt = settings['system_prompt'] ?? '';

    const combinedInstructions = knowledgeBase.trim()
      ? `${systemPrompt}\n\n---\n\n${knowledgeBase}`
      : systemPrompt;

    return {
      systemPrompt,
      knowledgeBase,
      combinedInstructions,
      llmModel: settings['llm_model'] ?? 'qwen2.5:32b',
      llmBaseUrl: settings['llm_base_url'] ?? 'http://localhost:11434/v1',
      ttsVoiceId: settings['tts_voice_id'] ?? 'auto',
      ttsModel: settings['tts_model'] ?? 'melotts',
      ttsSpeed: parseFloat(settings['tts_speed'] ?? '1'),
      ttsVariation: parseFloat(settings['tts_variation'] ?? '0.5'),
      callTimeLimitSeconds:
        settings['call_time_limit_enabled'] === 'true'
          ? Math.round(parseFloat(settings['call_time_limit_minutes'] ?? '10') * 60)
          : 0,
      callTimeLimitWarning: settings['call_time_limit_warning'] !== 'false',
    };
  }
}
