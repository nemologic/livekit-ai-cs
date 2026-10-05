import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../common/config/app-config.service';
import {
  IVoiceProvider,
  VoiceInfo,
  PreviewVoiceParams,
  VoiceSample,
} from './interfaces/voice-provider.interface';

// 로컬 음성 서버(speech/server.py)의 MeloTTS + OpenVoice를 호출한다
@Injectable()
export class MeloTtsService implements IVoiceProvider {
  constructor(
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {}

  private get baseUrl() {
    return this.appConfig.speechBaseUrl;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    const response = await firstValueFrom(this.httpService.get(`${this.baseUrl}/voices`));
    return response.data.voices ?? [];
  }

  async previewVoice({ voiceId, text, speed, variation }: PreviewVoiceParams): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/audio/speech`,
        { input: text, voice: voiceId, model: 'melotts', speed, variation, response_format: 'wav' },
        { responseType: 'arraybuffer' },
      ),
    );
    return Buffer.from(response.data).toString('base64');
  }

  async createVoice(name: string, sample: VoiceSample): Promise<VoiceInfo> {
    const form = new FormData();
    form.append('name', name);
    form.append('file', new Blob([new Uint8Array(sample.buffer)], { type: sample.mimetype }), sample.filename);
    const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/voices`, form));
    return response.data;
  }

  async deleteVoice(voiceId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/voices/${encodeURIComponent(voiceId)}`),
    );
  }
}
