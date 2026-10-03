import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { CallHistoryModule } from './call-history/call-history.module';
import { AgentStatusModule } from './agent-status/agent-status.module';
import { ForwardingModule } from './forwarding/forwarding.module';
import { TrainingModule } from './training/training.module';
import { VoiceModule } from './voice/voice.module';
import { ElevenLabsModule } from './elevenlabs/elevenlabs.module';
import { AgentConfigModule } from './agent-config/agent-config.module';
import { AgentSetting } from './settings/agent-setting.entity';
import { CallHistory } from './call-history/call-history.entity';
import { ForwardingSetting } from './forwarding/forwarding-setting.entity';
import { KnowledgeBase } from './training/knowledge-base.entity';
import { VoiceProfile } from './voice/voice-profile.entity';
import { DatabaseInitService } from './common/database-init.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '3306')),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_DATABASE', 'cs'),
        entities: [AgentSetting, CallHistory, ForwardingSetting, KnowledgeBase, VoiceProfile],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([AgentSetting, CallHistory, ForwardingSetting, KnowledgeBase, VoiceProfile]),
    CommonModule,
    ElevenLabsModule,
    AuthModule,
    SettingsModule,
    CallHistoryModule,
    AgentStatusModule,
    ForwardingModule,
    TrainingModule,
    VoiceModule,
    AgentConfigModule,
  ],
  providers: [DatabaseInitService],
})
export class AppModule {}
