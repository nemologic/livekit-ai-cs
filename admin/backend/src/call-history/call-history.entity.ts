import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('call_history')
export class CallHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'job_id', nullable: true })
  jobId: string;

  @Column({ name: 'participant_identity', nullable: true })
  participantIdentity: string;

  /** 상담 링크에 붙어 온 주문번호 (실제 주문인지는 확인하지 않은 값) */
  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'error'],
    default: 'active',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
