export const ADMIN_API_URL = process.env.ADMIN_API_URL ?? 'http://localhost:4001/api';
export const ADMIN_API_HEADERS = { 'x-api-key': process.env.LIVEKIT_API_KEY ?? 'devkey' };

export interface AgentConfig {
  systemPrompt: string;
  knowledgeBase: string;
  combinedInstructions: string;
  llmModel: string;
  llmBaseUrl: string;
  ttsVoiceId: string;
  ttsModel: string;
  ttsSpeed: number;
  ttsVariation: number;
  /** 통화 시간 제한(초). 0이면 제한 없음 */
  callTimeLimitSeconds: number;
  /** 종료 1분 전에 예고 멘트를 할지 */
  callTimeLimitWarning: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  systemPrompt: `당신은 고객센터의 AI 음성 상담원입니다. 고객과 전화로 대화하고 있습니다.

말하는 방식:
- 고객이 쓰는 언어로 답합니다. 한국어면 자연스러운 존댓말 구어체로 말합니다.
- 한 번에 한두 문장으로 짧게 답합니다. 답변은 그대로 음성으로 읽히므로 목록, 번호, 기호, 이모지, 괄호를 쓰지 않습니다.
- 질문이 모호하면 추측하지 말고 한 가지만 되물어 확인합니다.

지켜야 할 것:
- 아래 제공된 회사 정보와 안내 자료에 있는 내용만 사실로 안내합니다.
- 자료에 없는 내용(가격, 정책, 주문·배송 상태 등)은 지어내지 말고, 확인이 어렵다고 솔직히 말한 뒤 담당자 연결이나 다른 문의 방법을 안내합니다.
- 주문 조회나 계정 확인처럼 직접 할 수 없는 일을 해 주겠다고 약속하지 않습니다.
- 이름을 물으면 AI 상담원이라고 밝힙니다.`,
  knowledgeBase: '',
  combinedInstructions: '',
  llmModel: process.env.LLM_MODEL ?? 'qwen2.5:32b',
  llmBaseUrl: process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1',
  ttsVoiceId: 'auto',
  ttsModel: 'melotts',
  ttsSpeed: 1,
  ttsVariation: 0.5,
  callTimeLimitSeconds: 0,
  callTimeLimitWarning: true,
};

export async function fetchAgentConfig(): Promise<AgentConfig> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/agent-config`, {
      headers: ADMIN_API_HEADERS,
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
    console.error('[agent-config] 관리자 백엔드 연결 실패 — 기본값 사용:', (err as Error).message);
    return buildFallback();
  }
}

function buildFallback(): AgentConfig {
  return {
    ...DEFAULT_CONFIG,
    combinedInstructions: DEFAULT_CONFIG.systemPrompt,
  };
}
