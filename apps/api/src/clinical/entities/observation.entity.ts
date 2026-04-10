import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type {
  AnatomyRef, ObservationCategory, ObservationInterpretation, ProviderSource,
} from '@health-app/shared-types';

@Entity('observations')
export class Observation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() category: ObservationCategory;
  @Column() code: string;
  @Column() codeSystem: string;
  @Column() display: string;
  @Column() value: string;
  @Column({ nullable: true }) unit?: string;
  @Column({ type: 'float', nullable: true }) referenceRangeLow?: number;
  @Column({ type: 'float', nullable: true }) referenceRangeHigh?: number;
  @Column({ nullable: true }) interpretation?: ObservationInterpretation;

  @Column({ type: 'datetime' })
  effectiveDate: string;

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
