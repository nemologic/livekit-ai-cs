import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('voice_profiles')
export class VoiceProfile {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 100 }) name: string;
  @Column({ name: 'voice_id', length: 100 }) voiceId: string;
  @Column({ length: 100, default: 'melotts' }) model: string;
  /** 말하기 속도 (1.0 = 기본) */
  @Column({ type: 'float', default: 1.0 }) speed: number;
  /** 억양 변화 정도 0~1 (0.5 = 기본) */
  @Column({ type: 'float', default: 0.5 }) variation: number;
  @Column({ name: 'is_active', default: false }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
