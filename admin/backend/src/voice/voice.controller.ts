import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateVoiceProfileDto } from './dto/create-voice-profile.dto';
import { UpdateVoiceProfileDto } from './dto/update-voice-profile.dto';
import { PreviewVoiceDto } from './dto/preview-voice.dto';

const sampleInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new BadRequestException('오디오 파일만 업로드할 수 있습니다.'), false);
    }
  },
});

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

  /** 녹음 파일로 내 목소리 등록 */
  @Post('clone')
  @UseInterceptors(sampleInterceptor)
  cloneVoice(@UploadedFile() file: Express.Multer.File, @Body('name') name: string) {
    if (!file) throw new BadRequestException('녹음 파일을 첨부해주세요.');
    if (!name?.trim()) throw new BadRequestException('목소리 이름을 입력해주세요.');
    return this.voiceService.cloneVoice(name.trim(), {
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
    });
  }

  @Delete('clone/:voiceId')
  deleteClonedVoice(@Param('voiceId') voiceId: string) {
    return this.voiceService.deleteClonedVoice(voiceId);
  }
}
