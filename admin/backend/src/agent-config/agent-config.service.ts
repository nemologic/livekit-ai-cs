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
      llmModel: settings['llm_model'] ?? 'openai/gpt-oss-20b',
      llmBaseUrl: settings['llm_base_url'] ?? 'https://api.groq.com/openai/v1',
      ttsVoiceId: settings['tts_voice_id'] ?? '',
      ttsModel: settings['tts_model'] ?? 'eleven_multilingual_v2',
    };
  }
}
