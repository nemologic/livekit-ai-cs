import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VoiceProfile } from './voice-profile.entity';
import {
  IVoiceProvider,
  VOICE_PROVIDER,
  VoiceInfo,
  VoiceSample,
} from '../speech/interfaces/voice-provider.interface';
import { CreateVoiceProfileDto } from './dto/create-voice-profile.dto';
import { UpdateVoiceProfileDto } from './dto/update-voice-profile.dto';
import { PreviewVoiceDto } from './dto/preview-voice.dto';

const SPEECH_SERVER_ERROR = '로컬 음성 서버(MeloTTS) 호출에 실패했습니다.';

@Injectable()
export class VoiceService {
  constructor(
    @InjectRepository(VoiceProfile)
    private voiceProfileRepo: Repository<VoiceProfile>,
    private dataSource: DataSource,
    @Inject(VOICE_PROVIDER) private readonly voiceProvider: IVoiceProvider,
  ) {}

  async findAll(): Promise<VoiceProfile[]> {
    return this.voiceProfileRepo.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: number): Promise<VoiceProfile> {
    const record = await this.voiceProfileRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`목소리 프로필 ID ${id}를 찾을 수 없습니다.`);
    }
    return record;
  }

  async create(data: CreateVoiceProfileDto): Promise<VoiceProfile> {
    const record = this.voiceProfileRepo.create(data);
    return this.voiceProfileRepo.save(record);
  }

  async update(id: number, data: UpdateVoiceProfileDto): Promise<VoiceProfile> {
    const record = await this.findOne(id);
    Object.assign(record, data);
    const saved = await this.voiceProfileRepo.save(record);
    // 사용 중인 프로필을 고치면 다음 통화부터 바로 반영되게 한다
    if (saved.isActive) await this.applyToAgent(saved);
    return saved;
  }

  async delete(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.voiceProfileRepo.remove(record);
  }

  async activate(id: number): Promise<VoiceProfile> {
    const profile = await this.findOne(id);

    // Deactivate the currently active profile (TypeORM은 빈 조건의 update를 허용하지 않는다)
    await this.voiceProfileRepo.update({ isActive: true }, { isActive: false });

    // Activate this profile
    profile.isActive = true;
    const saved = await this.voiceProfileRepo.save(profile);
    await this.applyToAgent(saved);

    return saved;
  }

  /** 에이전트가 읽는 agent_settings에 프로필 값을 반영한다 */
  private async applyToAgent(profile: VoiceProfile): Promise<void> {
    const settings = {
      tts_voice_id: profile.voiceId,
      tts_model: profile.model,
      tts_speed: String(profile.speed),
      tts_variation: String(profile.variation),
    };
    for (const [key, value] of Object.entries(settings)) {
      await this.dataSource.query(
        `INSERT INTO agent_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, value],
      );
    }
  }

  async getAvailableVoices(): Promise<{ voices: any[]; error?: string }> {
    try {
      const voices = await this.voiceProvider.listVoices();
      return { voices };
    } catch (err) {
      return { voices: [], error: SPEECH_SERVER_ERROR };
    }
  }

  async previewVoice(dto: PreviewVoiceDto): Promise<{ audio: string; contentType: string; error?: string }> {
    try {
      const audio = await this.voiceProvider.previewVoice({
        voiceId: dto.voiceId,
        text: dto.text || '안녕하세요, 저는 AI 상담원입니다.',
        speed: dto.speed ?? 1.0,
        variation: dto.variation ?? 0.5,
      });
      return { audio, contentType: 'audio/wav' };
    } catch (err) {
      return { audio: '', contentType: '', error: SPEECH_SERVER_ERROR };
    }
  }

  /** 녹음 파일로 내 목소리를 등록한다 */
  async cloneVoice(name: string, sample: VoiceSample): Promise<VoiceInfo> {
    try {
      return await this.voiceProvider.createVoice(name, sample);
    } catch (err) {
      // 음성 서버가 알려준 사유(녹음이 너무 짧음 등)를 그대로 전달한다
      throw new BadRequestException(err.response?.data?.detail ?? SPEECH_SERVER_ERROR);
    }
  }

  async deleteClonedVoice(voiceId: string): Promise<void> {
    const inUse = await this.voiceProfileRepo.count({ where: { voiceId } });
    if (inUse > 0) {
      throw new BadRequestException('이 목소리를 쓰는 프로필이 있습니다. 프로필을 먼저 삭제하거나 바꿔 주세요.');
    }
    try {
      await this.voiceProvider.deleteVoice(voiceId);
    } catch (err) {
      throw new BadRequestException(err.response?.data?.detail ?? SPEECH_SERVER_ERROR);
    }
  }
}
