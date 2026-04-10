import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type {
  AnatomyRef, ConditionClinicalStatus, ProviderSource,
} from '@health-app/shared-types';

@Entity('conditions')
export class Condition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() code: string;
  @Column() codeSystem: string;
  @Column() display: string;
  @Column() clinicalStatus: ConditionClinicalStatus;

  @Column({ type: 'date', nullable: true })
  onsetDate?: string;

  @Column({ type: 'date' })
  recordedDate: string;

  @Column({ nullable: true })
  anatomyRef?: AnatomyRef;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
