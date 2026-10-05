import express, { type Request, type Response } from 'express';
import {
  AccessToken,
  RoomConfiguration,
  RoomAgentDispatch,
  RoomServiceClient,
  TokenVerifier,
} from 'livekit-server-sdk';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';

dotenv.config();

const app = express();
app.use(express.json());

// Allow CORS for Flutter Web
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;
const WS_URL = process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880';
const AGENT_NAME = 'support-agent';

// 동시 통화 제한 — Mac Studio의 LLM이 감당할 수 있는 통화 수.
// 관리자 화면에서 바꾸면 PUT /token/limit 으로 전달되고, 재시작해도 유지되도록 파일에 남긴다.
const CALL_LIMIT_FILE = process.env.CALL_LIMIT_FILE ?? 'call-limit.json';
const MAX_CALL_LIMIT = 20;
let maxConcurrentCalls = loadCallLimit();

function loadCallLimit(): number {
  try {
    return JSON.parse(fs.readFileSync(CALL_LIMIT_FILE, 'utf8')).maxConcurrentCalls;
  } catch {
    return parseInt(process.env.MAX_CONCURRENT_CALLS ?? '2', 10);
  }
}

const tokenVerifier = new TokenVerifier(API_KEY, API_SECRET);
// 상담 링크(https://<도메인>/<주문번호>)의 주문번호 형식
const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

// 주문번호가 실제 주문인지 esim-api-server에 확인한다 (GET /api/v1/cs/orders/:orderid/verify).
// 키가 없으면 형식만 검사한다 — esim 쪽 API가 배포되기 전에 쓰는 동작.
const ESIM_API_URL = process.env.ESIM_API_URL ?? 'http://127.0.0.1:3000';
const ESIM_CS_API_KEY = process.env.ESIM_CS_API_KEY;
const ORDER_VERIFY_TIMEOUT_MS = 3000;
const ORDER_CACHE_TTL_MS = 10 * 60_000;
// 확인된 주문번호 → 캐시 만료 시각 (같은 고객의 재접속 때 다시 묻지 않는다)
const verifiedOrders = new Map<string, number>();

// 주문번호를 바꿔 가며 넣어 보는 시도를 IP별로 제한한다
const FAILED_ATTEMPT_LIMIT = 10;
const FAILED_ATTEMPT_WINDOW_MS = 10 * 60_000;
const failedAttempts = new Map<string, number[]>();

if (!ESIM_CS_API_KEY) {
  console.warn('[token] ESIM_CS_API_KEY가 없어 주문번호를 형식만 검사합니다.');
}

// 본인 확인을 마친 고객만 받는 모드. esim 주문 페이지가 전화번호 뒷자리 인증을 통과한 고객에게
// 서명된 입장권(JWT, HS256, 키 = ESIM_CS_API_KEY)을 붙여 보내고, 여기서는 서명·만료·주문번호를 확인한다.
// 입장권이 없거나 만료됐으면 고객 화면이 ORDER_AUTH_URL/<주문번호>(인증 페이지)로 이동한다.
const TICKET_REQUIRED = process.env.ESIM_TICKET_REQUIRED === 'true' && Boolean(ESIM_CS_API_KEY);
const ORDER_AUTH_URL = process.env.ORDER_AUTH_URL ?? 'https://my.esimbongsa.com/orders/cs';
const TICKET_AUDIENCE = 'cs';

function isValidTicket(ticket: unknown, orderId: string): boolean {
  if (typeof ticket !== 'string' || !ESIM_CS_API_KEY) return false;
  const [header, payload, signature, ...rest] = ticket.split('.');
  if (!header || !payload || !signature || rest.length > 0) return false;

  try {
    const expected = crypto.createHmac('sha256', ESIM_CS_API_KEY).update(`${header}.${payload}`).digest();
    const given = Buffer.from(signature, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;

    const { alg } = JSON.parse(Buffer.from(header, 'base64url').toString());
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return (
      alg === 'HS256' &&
      claims.orderid === orderId &&
      claims.aud === TICKET_AUDIENCE &&
      typeof claims.exp === 'number' &&
      claims.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

type OrderCheck = 'valid' | 'not_found' | 'unavailable';

async function verifyOrder(orderId: string): Promise<OrderCheck> {
  if (!ESIM_CS_API_KEY) return 'valid';
  if ((verifiedOrders.get(orderId) ?? 0) > Date.now()) return 'valid';

  try {
    const res = await fetch(`${ESIM_API_URL}/api/v1/cs/orders/${encodeURIComponent(orderId)}/verify`, {
      headers: { 'x-cs-api-key': ESIM_CS_API_KEY },
      signal: AbortSignal.timeout(ORDER_VERIFY_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: { exists?: boolean } };
    if (typeof body.data?.exists !== 'boolean') throw new Error('응답 형식이 다릅니다');
    if (!body.data.exists) return 'not_found';
    verifiedOrders.set(orderId, Date.now() + ORDER_CACHE_TTL_MS);
    return 'valid';
  } catch (err) {
    console.error('[token] 주문 확인 실패:', (err as Error).message);
    return 'unavailable';
  }
}

function recentFailures(ip: string): number[] {
  const since = Date.now() - FAILED_ATTEMPT_WINDOW_MS;
  const recent = (failedAttempts.get(ip) ?? []).filter((at) => at > since);
  if (recent.length > 0) failedAttempts.set(ip, recent);
  else failedAttempts.delete(ip);
  return recent;
}
const PENDING_CALL_TTL_MS = 30_000;
const roomService = new RoomServiceClient(
  (process.env.LIVEKIT_URL ?? 'ws://localhost:7880').replace(/^ws/, 'http'),
  API_KEY,
  API_SECRET,
);
// 토큰은 받았지만 아직 방에 들어오지 않은 통화 (roomName → 발급 시각)
const pendingCalls = new Map<string, number>();

async function countActiveCalls(): Promise<number> {
  const activeRooms = new Set<string>();
  for (const room of await roomService.listRooms()) {
    const participants = await roomService.listParticipants(room.name);
    // 고객이 나간 뒤 에이전트만 남은 방은 통화로 세지 않는다
    if (participants.some((p) => !p.identity.startsWith('agent-'))) {
      activeRooms.add(room.name);
    }
  }

  const now = Date.now();
  for (const [name, issuedAt] of pendingCalls) {
    if (activeRooms.has(name) || now - issuedAt > PENDING_CALL_TTL_MS) {
      pendingCalls.delete(name);
    }
  }
  return activeRooms.size + pendingCalls.size;
}

// POST /token
// Body: { orderId: string, ticket?: string, roomName?: string, participantName?: string }
// Response: { token: string, serverUrl: string, roomName: string }
//           400 { error: 'order_id_required' } — 주문번호 없이 접속
//           401 { error: 'ticket_invalid', authUrl } — 입장권 없음·만료 (본인 확인 필요)
//           404 { error: 'order_not_found' } — 없는 주문번호
//           429 { error: 'too_many_attempts' } — 없는 주문번호를 반복 시도
//           503 { error: 'verify_unavailable' } — 주문 확인 서버가 응답하지 않음
//           503 { error: 'busy' } — 동시 통화 수 초과
app.post('/token', async (req: Request, res: Response) => {
  const roomName = (req.body.roomName as string) || `support-${crypto.randomUUID()}`;
  const participantName = (req.body.participantName as string) || `user-${crypto.randomUUID()}`;
  const orderId = req.body.orderId;

  if (typeof orderId !== 'string' || !ORDER_ID_PATTERN.test(orderId)) {
    res.status(400).json({ error: 'order_id_required' });
    return;
  }

  if (TICKET_REQUIRED && !isValidTicket(req.body.ticket, orderId)) {
    res.status(401).json({ error: 'ticket_invalid', authUrl: `${ORDER_AUTH_URL}/${orderId}` });
    return;
  }

  // nginx가 넘겨준 실제 접속 IP
  const clientIp = (req.headers['x-real-ip'] as string) ?? req.ip ?? 'unknown';
  const failures = recentFailures(clientIp);
  if (failures.length >= FAILED_ATTEMPT_LIMIT) {
    res.status(429).json({ error: 'too_many_attempts' });
    return;
  }

  // 입장권은 esim 서버가 실제 주문에만 발급하므로, 입장권을 확인했으면 다시 묻지 않는다
  const orderCheck = TICKET_REQUIRED ? 'valid' : await verifyOrder(orderId);
  if (orderCheck === 'not_found') {
    failedAttempts.set(clientIp, [...failures, Date.now()]);
    res.status(404).json({ error: 'order_not_found' });
    return;
  }
  if (orderCheck === 'unavailable') {
    res.status(503).json({ error: 'verify_unavailable' });
    return;
  }

  try {
    if ((await countActiveCalls()) >= maxConcurrentCalls) {
      res.status(503).json({ error: 'busy', maxConcurrentCalls });
      return;
    }
  } catch (err) {
    // LiveKit 조회가 실패했다고 상담 자체를 막지는 않는다
    console.error('[token] 통화 수 조회 실패:', (err as Error).message);
  }
  pendingCalls.set(roomName, Date.now());

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: participantName,
    ttl: '1h',
    // 에이전트가 통화 이력에 남길 수 있도록 참가자 속성으로 전달한다
    attributes: { orderId },
  });

  const roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: AGENT_NAME,
        metadata: JSON.stringify({ participantName }),
      }),
    ],
  });

  at.roomConfig = roomConfig;

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  res.status(201).json({ token, serverUrl: WS_URL, roomName });
});

// GET /token/config — 고객 화면이 열릴 때 읽는 설정
// Response: { ticketRequired: boolean, authUrl: string } — authUrl 뒤에 /<주문번호>를 붙여 이동한다
app.get('/token/config', (_req: Request, res: Response) => {
  res.json({ ticketRequired: TICKET_REQUIRED, authUrl: ORDER_AUTH_URL });
});

// PUT /token/limit
// Header: Authorization: Bearer <roomAdmin 권한의 LiveKit 토큰> — 관리자 백엔드만 만들 수 있다
// Body: { maxConcurrentCalls: number }
app.put('/token/limit', async (req: Request, res: Response) => {
  try {
    const bearer = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const claims = await tokenVerifier.verify(bearer);
    if (!claims.video?.roomAdmin) throw new Error('roomAdmin 권한 없음');
  } catch {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const value = Number(req.body.maxConcurrentCalls);
  if (!Number.isInteger(value) || value < 1 || value > MAX_CALL_LIMIT) {
    res.status(400).json({ error: `maxConcurrentCalls는 1~${MAX_CALL_LIMIT} 사이의 정수여야 합니다.` });
    return;
  }

  maxConcurrentCalls = value;
  fs.writeFileSync(CALL_LIMIT_FILE, JSON.stringify({ maxConcurrentCalls }));
  console.log(`[token] 동시 통화 한도 변경: ${value}`);
  res.json({ maxConcurrentCalls });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const PORT = parseInt(process.env.TOKEN_SERVER_PORT ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`Token server listening on port ${PORT}`);
});
