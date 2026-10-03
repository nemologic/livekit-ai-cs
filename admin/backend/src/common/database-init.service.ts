import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    await this.runMigrations();
  }

  private async runMigrations() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS agent_settings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          \`key\` VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await this.dataSource.query(`
        INSERT IGNORE INTO agent_settings (\`key\`, value) VALUES
          ('system_prompt', 'You are a professional and friendly customer support agent.\nAlways detect the customer''s language from their first message and respond in that same language throughout the conversation.\nYou support both Korean (한국어) and English. Be concise, empathetic, and solution-focused.\nWhen the customer switches languages, follow their lead and switch too.'),
          ('tts_voice_id', 'cgSgspJ2msm6clMCkdW9'),
          ('tts_model', 'eleven_multilingual_v2'),
          ('llm_model', 'openai/gpt-oss-20b'),
          ('llm_base_url', 'https://api.groq.com/openai/v1')
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS call_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          room_id VARCHAR(100) NOT NULL,
          job_id VARCHAR(100),
          participant_identity VARCHAR(100),
          started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP NULL,
          duration_seconds INT,
          status ENUM('active', 'completed', 'error') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS forwarding_settings (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          phone_number VARCHAR(50),
          sip_uri VARCHAR(200),
          \`condition\` ENUM('always', 'no_answer', 'busy') DEFAULT 'no_answer',
          enabled BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
          id INT PRIMARY KEY AUTO_INCREMENT,
          type ENUM('company_info', 'faq', 'scenario', 'prohibited') NOT NULL,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          enabled BOOLEAN DEFAULT true,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS voice_profiles (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          voice_id VARCHAR(100) NOT NULL,
          model VARCHAR(100) DEFAULT 'eleven_multilingual_v2',
          stability FLOAT DEFAULT 0.5,
          similarity_boost FLOAT DEFAULT 0.75,
          style FLOAT DEFAULT 0.0,
          use_speaker_boost BOOLEAN DEFAULT true,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await this.dataSource.query(`
        INSERT IGNORE INTO voice_profiles (id, name, voice_id, model, stability, similarity_boost, style, use_speaker_boost, is_active) VALUES
          (1, '기본 목소리 (Rachel)', 'cgSgspJ2msm6clMCkdW9', 'eleven_multilingual_v2', 0.5, 0.75, 0.0, true, true)
      `);

      // knowledge_base.source_filename 컬럼 추가 (없는 경우)
      const [cols] = await this.dataSource.query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'knowledge_base'
          AND COLUMN_NAME = 'source_filename'
      `);
      if (parseInt(cols.cnt) === 0) {
        await this.dataSource.query(
          `ALTER TABLE knowledge_base ADD COLUMN source_filename VARCHAR(255) NULL`,
        );
      }

      this.logger.log('Database tables initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database tables', error);
    }
  }
}
