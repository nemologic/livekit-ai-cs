import { ADMIN_API_URL, ADMIN_API_HEADERS } from './agent-config.js';

interface CallInfo {
  roomId: string;
  jobId?: string;
  participantIdentity?: string;
  orderId?: string;
}

export interface CallRecord {
  /** 통화 종료를 기록한다. 여러 번 불려도 한 번만 반영된다. */
  finish(status?: 'completed' | 'error'): Promise<void>;
}

// 통화 이력 기록 실패가 상담 자체를 막아서는 안 되므로 오류는 로그만 남긴다
export async function recordCallStart(info: CallInfo): Promise<CallRecord> {
  const startedAt = Date.now();
  let id: number | undefined;
  let finished = false;

  try {
    const res = await fetch(`${ADMIN_API_URL}/call-history`, {
      method: 'POST',
      headers: { ...ADMIN_API_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    id = ((await res.json()) as { data: { id: number } }).data.id;
  } catch (err) {
    console.error('[call-history] 통화 시작 기록 실패:', (err as Error).message);
  }

  return {
    async finish(status = 'completed') {
      if (finished || id === undefined) return;
      finished = true;
      try {
        const res = await fetch(`${ADMIN_API_URL}/call-history/${id}`, {
          method: 'PATCH',
          headers: { ...ADMIN_API_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            endedAt: new Date().toISOString(),
            durationSeconds: Math.round((Date.now() - startedAt) / 1000),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error('[call-history] 통화 종료 기록 실패:', (err as Error).message);
      }
    },
  };
}
