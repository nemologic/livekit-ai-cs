import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceProfile } from './voice-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { ElevenLabsModule } from '../elevenlabs/elevenlabs.module';

@Module({
  imports: [TypeOrmModule.forFeature([VoiceProfile]), AuthModule, ElevenLabsModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
