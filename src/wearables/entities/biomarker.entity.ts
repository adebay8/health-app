import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('biomarkers')
export class Biomarker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column({ length: 50 })
  providerName: string;

  @Column({ length: 100 })
  category: string;

  @Column({ length: 100 })
  type: string;

  @Column({ type: 'real' })
  value: number;

  @Column({ length: 50 })
  unit: string;

  @Column({ nullable: true })
  sourceEventId: string;

  @Column()
  startDate: string;

  @Column()
  endDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
