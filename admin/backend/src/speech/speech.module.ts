import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MeloTtsService } from './melo-tts.service';
import { VOICE_PROVIDER } from './interfaces/voice-provider.interface';

@Module({
  imports: [HttpModule],
  providers: [
    MeloTtsService,
    { provide: VOICE_PROVIDER, useExisting: MeloTtsService },
  ],
  exports: [MeloTtsService, VOICE_PROVIDER],
})
export class SpeechModule {}
