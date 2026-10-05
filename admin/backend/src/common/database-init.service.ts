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
          ('system_prompt', '당신은 고객센터의 AI 음성 상담원입니다. 고객과 전화로 대화하고 있습니다.\n\n말하는 방식:\n- 고객이 쓰는 언어로 답합니다. 한국어면 자연스러운 존댓말 구어체로 말합니다.\n- 한 번에 한두 문장으로 짧게 답합니다. 답변은 그대로 음성으로 읽히므로 목록, 번호, 기호, 이모지, 괄호를 쓰지 않습니다.\n- 질문이 모호하면 추측하지 말고 한 가지만 되물어 확인합니다.\n\n지켜야 할 것:\n- 아래 제공된 회사 정보와 안내 자료에 있는 내용만 사실로 안내합니다.\n- 자료에 없는 내용(가격, 정책, 주문·배송 상태 등)은 지어내지 말고, 확인이 어렵다고 솔직히 말한 뒤 담당자 연결이나 다른 문의 방법을 안내합니다.\n- 주문 조회나 계정 확인처럼 직접 할 수 없는 일을 해 주겠다고 약속하지 않습니다.\n- 이름을 물으면 AI 상담원이라고 밝힙니다.'),
          ('tts_voice_id', 'auto'),
          ('tts_model', 'melotts'),
          ('llm_model', 'qwen2.5:32b'),
          ('llm_base_url', 'http://localhost:11434/v1'),
          ('max_concurrent_calls', '2'),
          ('call_time_limit_enabled', 'false'),
          ('call_time_limit_minutes', '10'),
          ('call_time_limit_warning', 'true')
      `);

      // 클라우드(ElevenLabs/Groq) 설정으로 남아 있는 기존 값을 로컬 AI로 전환
      const [ttsModel] = await this.dataSource.query(
        `SELECT value FROM agent_settings WHERE \`key\` = 'tts_model'`,
      );
      if (ttsModel?.value?.startsWith('eleven_')) {
        await this.dataSource.query(`
          UPDATE agent_settings SET value = CASE \`key\`
            WHEN 'tts_voice_id' THEN 'auto'
            WHEN 'tts_model' THEN 'melotts'
            WHEN 'llm_model' THEN 'qwen2.5:32b'
            WHEN 'llm_base_url' THEN 'http://localhost:11434/v1'
          END
          WHERE \`key\` IN ('tts_voice_id', 'tts_model', 'llm_model', 'llm_base_url')
        `);
      }

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS call_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          room_id VARCHAR(100) NOT NULL,
          job_id VARCHAR(100),
          participant_identity VARCHAR(100),
          order_id VARCHAR(100),
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
          model VARCHAR(100) DEFAULT 'melotts',
          speed FLOAT NOT NULL DEFAULT 1.0,
          variation FLOAT NOT NULL DEFAULT 0.5,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // voice_profiles.speed / variation 컬럼 추가 (ElevenLabs 시절에 만들어진 테이블인 경우)
      for (const [column, fallback] of [['speed', 1.0], ['variation', 0.5]] as const) {
        const [found] = await this.dataSource.query(`
          SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'voice_profiles'
            AND COLUMN_NAME = '${column}'
        `);
        if (parseInt(found.cnt) === 0) {
          await this.dataSource.query(
            `ALTER TABLE voice_profiles ADD COLUMN ${column} FLOAT NOT NULL DEFAULT ${fallback}`,
          );
        }
      }

      // ElevenLabs 시절 테이블은 model 기본값이 eleven_* 이라 새 프로필이 그 값으로 저장된다
      await this.dataSource.query(
        `ALTER TABLE voice_profiles ALTER COLUMN model SET DEFAULT 'melotts'`,
      );

      await this.dataSource.query(`
        INSERT IGNORE INTO voice_profiles (id, name, voice_id, model, is_active) VALUES
          (1, '기본 목소리 (자동 언어 감지)', 'auto', 'melotts', true)
      `);

      await this.dataSource.query(`
        UPDATE voice_profiles SET name = '기본 목소리 (자동 언어 감지)', voice_id = 'auto', model = 'melotts'
        WHERE model LIKE 'eleven\\_%'
      `);

      // call_history.order_id 컬럼 추가 (없는 경우)
      const [orderIdCol] = await this.dataSource.query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'call_history'
          AND COLUMN_NAME = 'order_id'
      `);
      if (parseInt(orderIdCol.cnt) === 0) {
        await this.dataSource.query(
          `ALTER TABLE call_history ADD COLUMN order_id VARCHAR(100) NULL AFTER participant_identity`,
        );
      }

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
