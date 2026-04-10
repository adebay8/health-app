import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type { MedicationStatus, ProviderSource } from '@health-app/shared-types';

@Entity('medications')
export class Medication {
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
  @Column({ nullable: true }) dosage?: string;
  @Column({ nullable: true }) frequency?: string;
  @Column() status: MedicationStatus;

  @Column({ type: 'date', nullable: true }) startDate?: string;
  @Column({ type: 'date', nullable: true }) endDate?: string;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
