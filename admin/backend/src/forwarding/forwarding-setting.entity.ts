import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('forwarding_settings')
export class ForwardingSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'sip_uri', nullable: true })
  sipUri: string;

  @Column({
    type: 'enum',
    enum: ['always', 'no_answer', 'busy'],
    default: 'no_answer',
  })
  condition: string;

  @Column({ default: false })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
