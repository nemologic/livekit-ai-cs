export interface VoiceInfo {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export interface PreviewVoiceParams {
  voiceId: string;
  text: string;
  speed: number;
  variation: number;
}

export interface VoiceSample {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export const VOICE_PROVIDER = 'VOICE_PROVIDER';

export interface IVoiceProvider {
  listVoices(): Promise<VoiceInfo[]>;
  previewVoice(params: PreviewVoiceParams): Promise<string>; // returns base64 audio
  /** 녹음 파일로 새 목소리를 등록한다 */
  createVoice(name: string, sample: VoiceSample): Promise<VoiceInfo>;
  deleteVoice(voiceId: string): Promise<void>;
}
