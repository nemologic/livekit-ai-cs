import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentSetting } from './agent-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AgentSetting)
    private settingRepo: Repository<AgentSetting>,
  ) {}

  async findAll(): Promise<Record<string, string>> {
    const settings = await this.settingRepo.find();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async findByKey(key: string): Promise<AgentSetting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`설정 키 '${key}'를 찾을 수 없습니다.`);
    }
    return setting;
  }

  async updateMany(updates: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(updates)) {
      const existing = await this.settingRepo.findOne({ where: { key } });
      if (existing) {
        existing.value = value;
        await this.settingRepo.save(existing);
      } else {
        const newSetting = this.settingRepo.create({ key, value });
        await this.settingRepo.save(newSetting);
      }
    }
    return this.findAll();
  }
}
