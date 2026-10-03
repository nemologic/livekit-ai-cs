import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForwardingSetting } from './forwarding-setting.entity';
import { CreateForwardingDto } from './dto/create-forwarding.dto';
import { UpdateForwardingDto } from './dto/update-forwarding.dto';

@Injectable()
export class ForwardingService {
  constructor(
    @InjectRepository(ForwardingSetting)
    private forwardingRepo: Repository<ForwardingSetting>,
  ) {}

  async findAll(): Promise<ForwardingSetting[]> {
    return this.forwardingRepo.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: number): Promise<ForwardingSetting> {
    const record = await this.forwardingRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`착신 설정 ID ${id}를 찾을 수 없습니다.`);
    }
    return record;
  }

  async create(data: CreateForwardingDto): Promise<ForwardingSetting> {
    const record = this.forwardingRepo.create(data);
    return this.forwardingRepo.save(record);
  }

  async update(id: number, data: UpdateForwardingDto): Promise<ForwardingSetting> {
    const record = await this.findOne(id);
    Object.assign(record, data);
    return this.forwardingRepo.save(record);
  }

  async delete(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.forwardingRepo.remove(record);
  }

  async toggle(id: number): Promise<ForwardingSetting> {
    const record = await this.findOne(id);
    record.enabled = !record.enabled;
    return this.forwardingRepo.save(record);
  }
}
