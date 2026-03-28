import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ProcessingStatus {
  RECEIVED = 'received',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Entity('webhook_event_logs')
export class WebhookEventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  providerName: string;

  @Column({ length: 100 })
  eventType: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ type: 'text' })
  payload: string;

  @Column({ type: 'text', default: ProcessingStatus.RECEIVED })
  processingStatus: ProcessingStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  receivedAt: Date;
}
