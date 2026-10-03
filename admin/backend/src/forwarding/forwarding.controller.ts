import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ForwardingService } from './forwarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateForwardingDto } from './dto/create-forwarding.dto';
import { UpdateForwardingDto } from './dto/update-forwarding.dto';

@UseGuards(JwtAuthGuard)
@Controller('forwarding')
export class ForwardingController {
  constructor(private forwardingService: ForwardingService) {}

  @Get()
  findAll() {
    return this.forwardingService.findAll();
  }

  @Post()
  create(@Body() dto: CreateForwardingDto) {
    return this.forwardingService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateForwardingDto) {
    return this.forwardingService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.forwardingService.delete(id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.forwardingService.toggle(id);
  }
}
