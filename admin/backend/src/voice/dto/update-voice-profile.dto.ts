import { PartialType } from '@nestjs/mapped-types';
import { CreateVoiceProfileDto } from './create-voice-profile.dto';
export class UpdateVoiceProfileDto extends PartialType(CreateVoiceProfileDto) {}
