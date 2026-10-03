import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallHistory } from './call-history.entity';
import { CreateCallHistoryDto } from './dto/create-call-history.dto';
import { UpdateCallHistoryDto } from './dto/update-call-history.dto';

@Injectable()
export class CallHistoryService {
  constructor(
    @InjectRepository(CallHistory)
    private callHistoryRepo: Repository<CallHistory>,
  ) {}

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [data, total] = await this.callHistoryRepo.findAndCount({
      where,
      order: { startedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<CallHistory> {
    const record = await this.callHistoryRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`통화 이력 ID ${id}를 찾을 수 없습니다.`);
    }
    return record;
  }

  async create(data: CreateCallHistoryDto): Promise<CallHistory> {
    const record = this.callHistoryRepo.create({
      ...data,
      startedAt: new Date(),
      status: 'active',
    });
    return this.callHistoryRepo.save(record);
  }

  async update(id: number, data: UpdateCallHistoryDto): Promise<CallHistory> {
    const record = await this.findOne(id);
    if (data.status !== undefined) record.status = data.status;
    if (data.endedAt !== undefined) record.endedAt = new Date(data.endedAt);
    if (data.durationSeconds !== undefined) record.durationSeconds = data.durationSeconds;
    return this.callHistoryRepo.save(record);
  }
}
