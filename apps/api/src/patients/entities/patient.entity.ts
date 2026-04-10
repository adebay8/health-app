import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ExternalIds } from '@health-app/shared-types';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'text' })
  gender: Gender;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  phoneNumber: string;

  @Column({ type: 'simple-json', nullable: true })
  externalIds?: ExternalIds;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
