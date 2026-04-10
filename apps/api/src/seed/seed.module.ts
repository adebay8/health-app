import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Condition, Medication, Allergy, Observation, Encounter]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
