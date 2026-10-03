import { AgentSession, Agent } from '@livekit/agents';
import { STT } from '@livekit/agents-plugin-deepgram';
import { LLM } from '@livekit/agents-plugin-openai';
import { TTS } from '@livekit/agents-plugin-elevenlabs';
import { type AgentConfig } from './agent-config.js';

export function buildSession(config: AgentConfig): AgentSession {
  return new AgentSession({
    vad: null,
    stt: new STT({
      model: 'nova-3',
      language: 'ko',
    }),
    llm: new LLM({
      model: config.llmModel,
      baseURL: config.llmBaseUrl,
      apiKey: process.env.GROQ_API_KEY,
    }),
    tts: new TTS({
      voiceId: config.ttsVoiceId,
      model: config.ttsModel,
    }),
  });
}

export function createAgent(config: AgentConfig): Agent {
  return Agent.create({
    instructions: config.combinedInstructions,
  });
}
