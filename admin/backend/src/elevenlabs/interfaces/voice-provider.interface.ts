export interface VoiceInfo {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export interface PreviewVoiceParams {
  voiceId: string;
  text: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

export const VOICE_PROVIDER = 'VOICE_PROVIDER';

export interface IVoiceProvider {
  listVoices(): Promise<VoiceInfo[]>;
  previewVoice(params: PreviewVoiceParams): Promise<string>; // returns base64 audio
}
