import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('health_scores')
export class HealthScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column({ length: 50 })
  providerName: string;

  @Column({ length: 100 })
  type: string;

  @Column({ type: 'real' })
  value: number;

  @Column({ length: 50, nullable: true })
  state: string;

  @Column({ type: 'text', nullable: true })
  factors: string;

  @Column({ nullable: true })
  sourceEventId: string;

  @Column()
  recordedAt: string;

  @CreateDateColumn()
  createdAt: Date;
}
