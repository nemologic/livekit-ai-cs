import { Controller, Get, UseGuards } from '@nestjs/common';
import { AgentStatusService } from './agent-status.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('agent-status')
export class AgentStatusController {
  constructor(private agentStatusService: AgentStatusService) {}

  @Get()
  getActiveRooms() {
    return this.agentStatusService.getActiveRooms();
  }
}
