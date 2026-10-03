import { Injectable, Logger } from '@nestjs/common';
import { RoomServiceClient } from 'livekit-server-sdk';
import { AppConfigService } from '../common/config/app-config.service';

@Injectable()
export class AgentStatusService {
  private readonly logger = new Logger(AgentStatusService.name);
  private roomServiceClient: RoomServiceClient;

  constructor(private appConfig: AppConfigService) {
    const livekitUrl = this.appConfig.livekitUrl;
    const apiKey = this.appConfig.livekitApiKey;
    const apiSecret = this.appConfig.livekitApiSecret;

    // Convert ws:// to http:// for REST API
    const httpUrl = livekitUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');

    this.roomServiceClient = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  }

  async getActiveRooms() {
    try {
      const rooms = await this.roomServiceClient.listRooms();
      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          let participants = [];
          try {
            participants = await this.roomServiceClient.listParticipants(room.name);
          } catch (e) {
            this.logger.warn(`Failed to get participants for room ${room.name}`);
          }

          const creationTime = room.creationTime
            ? Number(room.creationTime)
            : Math.floor(Date.now() / 1000);

          const durationSeconds = Math.floor(Date.now() / 1000) - creationTime;

          return {
            name: room.name,
            sid: room.sid,
            numParticipants: room.numParticipants || participants.length,
            creationTime: creationTime,
            durationSeconds,
            participants: participants.map((p) => ({
              identity: p.identity,
              name: p.name,
              joinedAt: p.joinedAt ? Number(p.joinedAt) : null,
            })),
          };
        }),
      );

      return {
        rooms: roomsWithParticipants,
        totalRooms: roomsWithParticipants.length,
        totalParticipants: roomsWithParticipants.reduce(
          (sum, r) => sum + (r.numParticipants || 0),
          0,
        ),
      };
    } catch (error) {
      this.logger.error('Failed to fetch LiveKit rooms', error.message);
      return {
        rooms: [],
        totalRooms: 0,
        totalParticipants: 0,
        error: 'LiveKit 서버에 연결할 수 없습니다.',
      };
    }
  }
}
