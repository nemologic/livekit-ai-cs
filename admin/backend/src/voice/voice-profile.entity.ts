import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('voice_profiles')
export class VoiceProfile {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 100 }) name: string;
  @Column({ name: 'voice_id', length: 100 }) voiceId: string;
  @Column({ length: 100, default: 'eleven_multilingual_v2' }) model: string;
  @Column({ type: 'float', default: 0.5 }) stability: number;
  @Column({ name: 'similarity_boost', type: 'float', default: 0.75 }) similarityBoost: number;
  @Column({ type: 'float', default: 0.0 }) style: number;
  @Column({ name: 'use_speaker_boost', default: true }) useSpeakerBoost: boolean;
  @Column({ name: 'is_active', default: false }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
