import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
} from '@livekit/agents';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { buildSession, createAgent } from './agent.js';
import { fetchAgentConfig } from './agent-config.js';

dotenv.config();

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.ready = true;
  },

  entry: async (ctx: JobContext) => {
    await ctx.connect();

    // 관리자 백엔드에서 시스템 프롬프트 + 지식 베이스 + LLM/TTS 설정을 가져옴
    const config = await fetchAgentConfig();

    const session = buildSession(config);

    await session.start({
      agent: createAgent(config),
      room: ctx.room,
    });

    await session.generateReply({
      instructions:
        'Greet the customer warmly and ask how you can help them today. ' +
        'If their first message is in Korean, respond in Korean (e.g. 안녕하세요! 어떻게 도와드릴까요?). ' +
        'Otherwise respond in English.',
    });
  },
});

cli.runApp(
  new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'support-agent',
  }),
);
