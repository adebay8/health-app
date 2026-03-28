import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('wearable_profiles')
@Unique(['patientId', 'providerName'])
export class WearableProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ length: 50 })
  providerName: string;

  @Column()
  externalId: string;

  @Column({ nullable: true })
  providerProfileId: string;

  @Column({ nullable: true })
  profileToken: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
