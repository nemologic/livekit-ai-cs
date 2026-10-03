import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ElevenLabsService } from './elevenlabs.service';
import { VOICE_PROVIDER } from './interfaces/voice-provider.interface';

@Module({
  imports: [HttpModule],
  providers: [
    ElevenLabsService,
    { provide: VOICE_PROVIDER, useExisting: ElevenLabsService },
  ],
  exports: [ElevenLabsService, VOICE_PROVIDER],
})
export class ElevenLabsModule {}
