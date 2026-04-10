import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type { AllergySeverity, ProviderSource } from '@health-app/shared-types';

@Entity('allergies')
export class Allergy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() substance: string;
  @Column({ nullable: true }) reaction?: string;
  @Column({ nullable: true }) severity?: AllergySeverity;

  @Column({ type: 'date' })
  recordedDate: string;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
