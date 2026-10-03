import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CallHistoryService } from './call-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateCallHistoryDto } from './dto/create-call-history.dto';
import { UpdateCallHistoryDto } from './dto/update-call-history.dto';

@Controller('call-history')
export class CallHistoryController {
  constructor(private callHistoryService: CallHistoryService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.callHistoryService.findAll(
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.callHistoryService.findOne(id);
  }

  @UseGuards(ApiKeyGuard)
  @Post()
  create(@Body() dto: CreateCallHistoryDto) {
    return this.callHistoryService.create(dto);
  }

  @UseGuards(ApiKeyGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCallHistoryDto,
  ) {
    return this.callHistoryService.update(id, dto);
  }
}
