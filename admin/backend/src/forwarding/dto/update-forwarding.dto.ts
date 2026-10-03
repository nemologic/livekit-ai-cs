import { PartialType } from '@nestjs/mapped-types';
import { CreateForwardingDto } from './create-forwarding.dto';
export class UpdateForwardingDto extends PartialType(CreateForwardingDto) {}
