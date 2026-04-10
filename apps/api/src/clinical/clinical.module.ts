import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Condition } from './entities/condition.entity';
import { Medication } from './entities/medication.entity';
import { Allergy } from './entities/allergy.entity';
import { Observation } from './entities/observation.entity';
import { Encounter } from './entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Condition, Medication, Allergy, Observation, Encounter]),
  ],
  exports: [TypeOrmModule],
})
export class ClinicalModule {}
