import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get adminId(): string { return this.config.getOrThrow('ADMIN_ID'); }
  get adminPassword(): string { return this.config.getOrThrow('ADMIN_PW'); }
  get jwtSecret(): string { return this.config.get('JWT_SECRET', 'livekit-admin-secret-2024'); }
  get jwtExpiresIn(): string { return this.config.get('JWT_EXPIRES_IN', '8h'); }
  get elevenLabsApiKey(): string { return this.config.getOrThrow('ELEVEN_API_KEY'); }
  get livekitUrl(): string { return this.config.get('LIVEKIT_URL', 'ws://localhost:7880'); }
  get livekitApiKey(): string { return this.config.get('LIVEKIT_API_KEY', 'devkey'); }
  get livekitApiSecret(): string { return this.config.get('LIVEKIT_API_SECRET', 'devsecret'); }
  get port(): number { return parseInt(this.config.get('PORT', '4001')); }
}
