import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_base')
export class KnowledgeBase {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'enum', enum: ['company_info', 'faq', 'scenario', 'prohibited'] }) type: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) content: string;
  @Column({ default: true }) enabled: boolean;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @Column({ name: 'source_filename', length: 255, nullable: true }) sourceFilename: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
