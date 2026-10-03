const ADMIN_API_URL = process.env.ADMIN_API_URL ?? 'http://localhost:4001/api';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';

export interface AgentConfig {
  systemPrompt: string;
  knowledgeBase: string;
  combinedInstructions: string;
  llmModel: string;
  llmBaseUrl: string;
  ttsVoiceId: string;
  ttsModel: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  systemPrompt: `You are a professional and friendly customer support agent.
Always detect the customer's language from their first message and respond in that same language throughout the conversation.
You support both Korean (한국어) and English. Be concise, empathetic, and solution-focused.
When the customer switches languages, follow their lead and switch too.`,
  knowledgeBase: '',
  combinedInstructions: '',
  llmModel: 'openai/gpt-oss-20b',
  llmBaseUrl: 'https://api.groq.com/openai/v1',
  ttsVoiceId: 'cgSgspJ2msm6clMCkdW9',
  ttsModel: 'eleven_multilingual_v2',
};

export async function fetchAgentConfig(): Promise<AgentConfig> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/agent-config`, {
      headers: { 'x-api-key': LIVEKIT_API_KEY },
    });

    if (!res.ok) {
      console.error(`[agent-config] 설정 조회 실패: HTTP ${res.status}`);
      return buildFallback();
    }

    const body = await res.json() as { success: boolean; data: AgentConfig };
    const config = body.data;

    // combinedInstructions가 비어있으면 systemPrompt만 사용
    if (!config.combinedInstructions?.trim()) {
      config.combinedInstructions = config.systemPrompt;
    }

    console.log(`[agent-config] 설정 로드 완료 (LLM: ${config.llmModel})`);
    return config;
  } catch (err) {
    console.error('[agent-config] 관리자 백엔드 연결 실패 — 기본값 사용:', err.message);
    return buildFallback();
  }
}

function buildFallback(): AgentConfig {
  return {
    ...DEFAULT_CONFIG,
    combinedInstructions: DEFAULT_CONFIG.systemPrompt,
  };
}
