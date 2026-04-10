import {
  Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import type { EncounterType, ProviderSource } from '@health-app/shared-types';

@Entity('encounters')
export class Encounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column() type: EncounterType;
  @Column({ nullable: true }) reason?: string;
  @Column({ nullable: true }) providerName?: string;

  @Column({ type: 'datetime' })
  startDate: string;

  @Column({ type: 'datetime', nullable: true })
  endDate?: string;

  @Column() providerSource: ProviderSource;
  @Column() providerRecordId: string;
  @Column({ type: 'datetime' }) fetchedAt: string;

  @Column({ type: 'simple-json', nullable: true })
  rawSnapshot?: unknown;

  @CreateDateColumn()
  createdAt: Date;
}
