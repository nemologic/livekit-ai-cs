import express, { type Request, type Response } from 'express';
import { AccessToken, RoomConfiguration, RoomAgentDispatch } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

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

// POST /token
// Body: { roomName?: string, participantName?: string }
// Response: { token: string, serverUrl: string, roomName: string }
app.post('/token', async (req: Request, res: Response) => {
  const roomName = (req.body.roomName as string) || `support-${crypto.randomUUID()}`;
  const participantName = (req.body.participantName as string) || `user-${crypto.randomUUID()}`;

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: participantName,
    ttl: '1h',
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

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const PORT = parseInt(process.env.TOKEN_SERVER_PORT ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`Token server listening on port ${PORT}`);
});
