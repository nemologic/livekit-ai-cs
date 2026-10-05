import { AgentSession, Agent, type llm } from '@livekit/agents';
import { STT, LLM, TTS } from '@livekit/agents-plugin-openai';
import { OpenAI } from 'openai';
import { type AgentConfig } from './agent-config.js';
import { searchKnowledge } from './knowledge.js';

// 로컬 음성 서버 (speech/server.py) — OpenAI 호환 API
const SPEECH_BASE_URL = process.env.SPEECH_BASE_URL ?? 'http://localhost:8100/v1';
const LOCAL_API_KEY = 'local';

// 관리자 화면에서 고른 LLM 주소에 맞는 API 키. 로컬(Ollama)은 키가 필요 없다.
function llmApiKey(baseUrl: string): string {
  if (baseUrl.includes('api.openai.com')) {
    return process.env.OPENAI_API_KEY ?? '';
  }
  return process.env.LLM_API_KEY ?? LOCAL_API_KEY;
}

export function buildSession(config: AgentConfig): AgentSession {
  // STT/TTS 모두 비스트리밍이므로 AgentSession 기본 VAD(로컬 silero)로 발화를 끊어 보낸다
  return new AgentSession({
    stt: new STT({
      model: 'whisper-large-v3',
      language: 'ko',
      baseURL: SPEECH_BASE_URL,
      apiKey: LOCAL_API_KEY,
      useRealtime: false,
    }),
    llm: new LLM({
      model: config.llmModel,
      baseURL: config.llmBaseUrl,
      apiKey: llmApiKey(config.llmBaseUrl),
    }),
    tts: new TTS({
      model: config.ttsModel,
      voice: config.ttsVoiceId as never,
      speed: config.ttsSpeed,
      // 억양 변화 정도는 OpenAI API에 없는 값이라 쿼리 파라미터로 음성 서버에 넘긴다
      client: new OpenAI({
        baseURL: SPEECH_BASE_URL,
        apiKey: LOCAL_API_KEY,
        maxRetries: 0,
        defaultQuery: { variation: String(config.ttsVariation) },
      }),
    }),
  });
}

class SupportAgent extends Agent {
  // 고객 발화가 끝날 때마다 관련 지식을 찾아 이번 답변의 참고 자료로 붙인다
  async onUserTurnCompleted(chatCtx: llm.ChatContext, newMessage: llm.ChatMessage): Promise<void> {
    const passages = await searchKnowledge(newMessage.textContent ?? '');
    if (passages.length === 0) return;
    chatCtx.addMessage({
      role: 'system',
      content:
        '다음은 고객의 이번 질문과 관련해 지식 베이스에서 찾은 자료입니다. ' +
        '질문과 관련 있는 내용만 근거로 사용하세요.\n\n' +
        passages.join('\n\n---\n\n'),
    });
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new SupportAgent({
    instructions: config.combinedInstructions,
  });
}
