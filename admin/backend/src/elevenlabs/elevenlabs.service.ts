import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../common/config/app-config.service';
import { IVoiceProvider, VoiceInfo, PreviewVoiceParams } from './interfaces/voice-provider.interface';

@Injectable()
export class ElevenLabsService implements IVoiceProvider {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {}

  private get headers() {
    return { 'xi-api-key': this.appConfig.elevenLabsApiKey };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/voices`, { headers: this.headers }),
      );
      return response.data.voices ?? [];
    } catch (error) {
      this.logger.error('ElevenLabs 목소리 목록 조회 실패', error.message);
      return [];
    }
  }

  async previewVoice({ voiceId, text, stability, similarityBoost, style }: PreviewVoiceParams): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability, similarity_boost: similarityBoost, style },
        },
        {
          headers: { ...this.headers, 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
        },
      ),
    );
    return Buffer.from(response.data).toString('base64');
  }
}
