import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { LlmModule } from '../llm/llm.module';
import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, Condition, Medication, Allergy, Observation, Encounter]),
    LlmModule,
  ],
  controllers: [DashboardController, InsightsController],
  providers: [DashboardService, InsightsService],
  exports: [DashboardService, InsightsService],
})
export class DashboardModule {}
