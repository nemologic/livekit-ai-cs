import { Injectable, NotFoundException, BadRequestException, BadGatewayException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessToken } from 'livekit-server-sdk';
import { AgentSetting } from './agent-setting.entity';
import { AppConfigService } from '../common/config/app-config.service';

const CALL_LIMIT_KEY = 'max_concurrent_calls';
const MAX_CALL_LIMIT = 20;
const TIME_LIMIT_KEY = 'call_time_limit_minutes';
const MAX_TIME_LIMIT_MINUTES = 120;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AgentSetting)
    private settingRepo: Repository<AgentSetting>,
    private readonly appConfig: AppConfigService,
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
    const callLimit = updates[CALL_LIMIT_KEY];
    if (callLimit !== undefined) {
      const value = Number(callLimit);
      if (!Number.isInteger(value) || value < 1 || value > MAX_CALL_LIMIT) {
        throw new BadRequestException(`동시 통화 수는 1~${MAX_CALL_LIMIT} 사이의 정수여야 합니다.`);
      }
      // 한도를 실제로 검사하는 곳은 VPS의 토큰 서버라서, 거기에 반영된 뒤에만 저장한다
      await this.pushCallLimit(value);
    }

    const timeLimit = updates[TIME_LIMIT_KEY];
    if (timeLimit !== undefined) {
      const minutes = Number(timeLimit);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TIME_LIMIT_MINUTES) {
        throw new BadRequestException(`통화 시간 제한은 1~${MAX_TIME_LIMIT_MINUTES}분 사이의 정수여야 합니다.`);
      }
    }

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

  /** 토큰 서버(PUT /token/limit)에 동시 통화 한도를 전달한다 */
  private async pushCallLimit(maxConcurrentCalls: number): Promise<void> {
    const admin = new AccessToken(this.appConfig.livekitApiKey, this.appConfig.livekitApiSecret, {
      identity: 'admin-backend',
      ttl: '1m',
    });
    admin.addGrant({ roomAdmin: true });

    try {
      const res = await fetch(`${this.appConfig.tokenServerUrl}/limit`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${await admin.toJwt()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxConcurrentCalls }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new BadGatewayException(`토큰 서버에 동시 통화 수를 반영하지 못했습니다 (${err.message}).`);
    }
  }
}
