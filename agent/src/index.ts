import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { buildSession, createAgent } from './agent.js';
import { fetchAgentConfig } from './agent-config.js';
import { recordCallStart } from './call-history.js';

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

    // 관리자 화면의 통화 이력에 기록 — 고객이 나가 세션이 닫히거나 작업이 끝날 때 종료 처리
    const participant = await ctx.waitForParticipant();
    const call = await recordCallStart({
      roomId: ctx.room.name ?? '',
      jobId: ctx.job.id,
      participantIdentity: participant.identity,
      orderId: participant.attributes.orderId,
    });
    session.on(voice.AgentSessionEventTypes.Close, () => void call.finish());
    ctx.addShutdownCallback(() => call.finish());

    await session.start({
      agent: createAgent(config),
      room: ctx.room,
    });

    // 관리자 화면에서 켠 통화 시간 제한 — 시간이 되면 안내하고 방을 닫아 고객 쪽 통화도 끝낸다
    if (config.callTimeLimitSeconds > 0) {
      // 종료 1분 전 예고 (관리자 화면에서 끌 수 있다). 제한이 1분 이하면 예고할 틈이 없으므로 생략한다
      const WARNING_SECONDS = 60;
      const warning =
        config.callTimeLimitWarning && config.callTimeLimitSeconds > WARNING_SECONDS
          ? setTimeout(
              () => session.say('상담 시간이 1분 남았습니다.'),
              (config.callTimeLimitSeconds - WARNING_SECONDS) * 1000,
            )
          : undefined;
      session.on(voice.AgentSessionEventTypes.Close, () => clearTimeout(warning));

      const timer = setTimeout(async () => {
        try {
          await session
            .say('상담 시간이 다 되어 통화를 종료합니다. 이용해 주셔서 감사합니다.', {
              allowInterruptions: false,
            })
            .waitForPlayout();
        } catch (err) {
          console.error('[time-limit] 종료 안내 실패:', (err as Error).message);
        }
        // 방을 지우면 세션 종료 이벤트보다 먼저 프로세스가 정리될 수 있어, 이력을 먼저 닫는다
        await call.finish();
        await ctx.deleteRoom();
      }, config.callTimeLimitSeconds * 1000);
      session.on(voice.AgentSessionEventTypes.Close, () => clearTimeout(timer));
    }

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
