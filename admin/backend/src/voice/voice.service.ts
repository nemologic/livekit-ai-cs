import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VoiceProfile } from './voice-profile.entity';
import { IVoiceProvider, VOICE_PROVIDER } from '../elevenlabs/interfaces/voice-provider.interface';
import { CreateVoiceProfileDto } from './dto/create-voice-profile.dto';
import { UpdateVoiceProfileDto } from './dto/update-voice-profile.dto';
import { PreviewVoiceDto } from './dto/preview-voice.dto';

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
    return this.voiceProfileRepo.save(record);
  }

  async delete(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.voiceProfileRepo.remove(record);
  }

  async activate(id: number): Promise<VoiceProfile> {
    const profile = await this.findOne(id);

    // Deactivate all profiles
    await this.voiceProfileRepo.update({}, { isActive: false });

    // Activate this profile
    profile.isActive = true;
    const saved = await this.voiceProfileRepo.save(profile);

    // Update agent_settings table
    await this.dataSource.query(
      `UPDATE agent_settings SET value = ? WHERE \`key\` = 'tts_voice_id'`,
      [profile.voiceId],
    );
    await this.dataSource.query(
      `UPDATE agent_settings SET value = ? WHERE \`key\` = 'tts_model'`,
      [profile.model],
    );

    return saved;
  }

  async getAvailableVoices(): Promise<{ voices: any[]; error?: string }> {
    try {
      const voices = await this.voiceProvider.listVoices();
      return { voices };
    } catch (err) {
      return { voices: [], error: 'ElevenLabs API 호출에 실패했습니다.' };
    }
  }

  async previewVoice(dto: PreviewVoiceDto): Promise<{ audio: string; contentType: string; error?: string }> {
    try {
      const audio = await this.voiceProvider.previewVoice({
        voiceId: dto.voiceId,
        text: dto.text || '안녕하세요, 저는 AI 상담원입니다.',
        stability: dto.stability ?? 0.5,
        similarityBoost: dto.similarityBoost ?? 0.75,
        style: dto.style ?? 0.0,
      });
      return { audio, contentType: 'audio/mpeg' };
    } catch (err) {
      return { audio: '', contentType: '', error: 'ElevenLabs TTS API 호출에 실패했습니다.' };
    }
  }
}
