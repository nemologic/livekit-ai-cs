import { IsString } from 'class-validator';

export class UpdateSettingsDto {
  [key: string]: string;
}
