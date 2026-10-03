import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateVoiceProfileDto } from './dto/create-voice-profile.dto';
import { UpdateVoiceProfileDto } from './dto/update-voice-profile.dto';
import { PreviewVoiceDto } from './dto/preview-voice.dto';

@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  @Get('profiles')
  findAll() {
    return this.voiceService.findAll();
  }

  @Post('profiles')
  create(@Body() dto: CreateVoiceProfileDto) {
    return this.voiceService.create(dto);
  }

  @Put('profiles/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoiceProfileDto) {
    return this.voiceService.update(id, dto);
  }

  @Delete('profiles/:id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.voiceService.delete(id);
  }

  @Post('profiles/:id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.voiceService.activate(id);
  }

  @Get('available')
  getAvailableVoices() {
    return this.voiceService.getAvailableVoices();
  }

  @Post('preview')
  previewVoice(@Body() dto: PreviewVoiceDto) {
    return this.voiceService.previewVoice(dto);
  }
}
