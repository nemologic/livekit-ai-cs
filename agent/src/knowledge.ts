// AnythingLLM 워크스페이스에서 고객 질문과 관련된 문서 조각을 찾아온다 (챗봇과 같은 지식 베이스)
const BASE_URL = process.env.ANYTHINGLLM_BASE_URL ?? 'http://localhost:3001/api/v1';
const API_KEY = process.env.ANYTHINGLLM_API_KEY;
const WORKSPACE = process.env.ANYTHINGLLM_WORKSPACE;
const SEARCH_TIMEOUT_MS = 2000;
const TOP_N = 4;
// bge-m3 기준: 관련 질문은 0.45 이상, 무관한 질문은 0.36 이하로 나온다
const SCORE_THRESHOLD = 0.4;

interface SearchResult {
  text: string;
  score: number;
}

export const knowledgeSearchEnabled = Boolean(API_KEY && WORKSPACE);

// 검색이 느리거나 AnythingLLM이 꺼져 있어도 통화는 이어져야 하므로, 실패하면 빈 결과로 넘어간다
export async function searchKnowledge(query: string): Promise<string[]> {
  if (!knowledgeSearchEnabled || !query.trim()) return [];

  try {
    const res = await fetch(`${BASE_URL}/workspace/${WORKSPACE}/vector-search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topN: TOP_N, scoreThreshold: SCORE_THRESHOLD }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { results?: SearchResult[] };
    return (body.results ?? []).map((result) => result.text.trim()).filter(Boolean);
  } catch (err) {
    console.error('[knowledge] 지식 검색 실패:', (err as Error).message);
    return [];
  }
}
