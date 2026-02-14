import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { RedoxService } from './redox.service';
import { SearchPatientDto } from './dto/search-patient.dto';
import { PatientSearchResult } from './interfaces/redox-patient-search.interface';
import { MedicationResult } from './interfaces/fhir-medication.interface';
import { ConditionResult } from './interfaces/fhir-condition.interface';
import { AllergyResult } from './interfaces/fhir-allergy.interface';
import { ObservationResult } from './interfaces/fhir-observation.interface';
import { ImmunizationResult } from './interfaces/fhir-immunization.interface';
import { ProcedureResult } from './interfaces/fhir-procedure.interface';
import { EncounterResult } from './interfaces/fhir-encounter.interface';
import { DiagnosticReportResult } from './interfaces/fhir-diagnostic-report.interface';
import { CarePlanResult } from './interfaces/fhir-care-plan.interface';
import { DocumentReferenceResult } from './interfaces/fhir-document-reference.interface';
import { GoalResult } from './interfaces/fhir-goal.interface';
import { CareTeamResult } from './interfaces/fhir-care-team.interface';
import { FamilyMemberHistoryResult } from './interfaces/fhir-family-history.interface';
import { MedicationAdministrationResult } from './interfaces/fhir-medication-administration.interface';
import { MedicationStatementResult } from './interfaces/fhir-medication-statement.interface';

@Controller('redox')
export class RedoxController {
  constructor(private readonly redoxService: RedoxService) {}

  @Post('patients/search')
  @HttpCode(HttpStatus.OK)
  async searchPatients(
    @Body() searchDto: SearchPatientDto,
  ): Promise<{ results: PatientSearchResult[]; total: number }> {
    const results = await this.redoxService.searchPatients({
      given: searchDto.given,
      family: searchDto.family,
      birthdate: searchDto.birthdate,
      gender: searchDto.gender,
      identifier: searchDto.identifier,
      address: searchDto.address,
      telecom: searchDto.telecom,
    });

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/search')
  async searchPatientsGet(
    @Query('given') given: string,
    @Query('family') family: string,
    @Query('birthdate') birthdate: string,
    @Query('gender') gender?: string,
    @Query('identifier') identifier?: string,
  ): Promise<{ results: PatientSearchResult[]; total: number }> {
    const results = await this.redoxService.searchPatients({
      given,
      family,
      birthdate,
      gender,
      identifier,
    });

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/medications')
  async getPatientMedications(
    @Param('patientId') patientId: string,
    @Query('intent') intent?: string,
  ): Promise<{ results: MedicationResult[]; total: number }> {
    const results = await this.redoxService.searchMedications(
      patientId,
      intent,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/conditions')
  async getPatientConditions(
    @Param('patientId') patientId: string,
    @Query('clinical-status') clinicalStatus?: string,
  ): Promise<{ results: ConditionResult[]; total: number }> {
    const results = await this.redoxService.searchConditions(
      patientId,
      clinicalStatus,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/allergies')
  async getPatientAllergies(
    @Param('patientId') patientId: string,
    @Query('clinical-status') clinicalStatus?: string,
  ): Promise<{ results: AllergyResult[]; total: number }> {
    const results = await this.redoxService.searchAllergies(
      patientId,
      clinicalStatus,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/observations')
  async getPatientObservations(
    @Param('patientId') patientId: string,
    @Query('category') category?: string,
    @Query('code') code?: string,
  ): Promise<{ results: ObservationResult[]; total: number }> {
    const results = await this.redoxService.searchObservations(
      patientId,
      category,
      code,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/immunizations')
  async getPatientImmunizations(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: ImmunizationResult[]; total: number }> {
    const results = await this.redoxService.searchImmunizations(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/procedures')
  async getPatientProcedures(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: ProcedureResult[]; total: number }> {
    const results = await this.redoxService.searchProcedures(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/encounters')
  async getPatientEncounters(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: EncounterResult[]; total: number }> {
    const results = await this.redoxService.searchEncounters(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/diagnostic-reports')
  async getPatientDiagnosticReports(
    @Param('patientId') patientId: string,
    @Query('category') category?: string,
  ): Promise<{ results: DiagnosticReportResult[]; total: number }> {
    const results = await this.redoxService.searchDiagnosticReports(
      patientId,
      category,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/care-plans')
  async getPatientCarePlans(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: CarePlanResult[]; total: number }> {
    const results = await this.redoxService.searchCarePlans(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/documents')
  async getPatientDocuments(
    @Param('patientId') patientId: string,
    @Query('type') type?: string,
  ): Promise<{ results: DocumentReferenceResult[]; total: number }> {
    const results = await this.redoxService.searchDocumentReferences(
      patientId,
      type,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/goals')
  async getPatientGoals(
    @Param('patientId') patientId: string,
    @Query('lifecycle-status') lifecycleStatus?: string,
  ): Promise<{ results: GoalResult[]; total: number }> {
    const results = await this.redoxService.searchGoals(
      patientId,
      lifecycleStatus,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/care-teams')
  async getPatientCareTeams(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: CareTeamResult[]; total: number }> {
    const results = await this.redoxService.searchCareTeams(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/family-history')
  async getPatientFamilyHistory(
    @Param('patientId') patientId: string,
  ): Promise<{ results: FamilyMemberHistoryResult[]; total: number }> {
    const results = await this.redoxService.searchFamilyHistory(patientId);

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/medication-administrations')
  async getPatientMedicationAdministrations(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: MedicationAdministrationResult[]; total: number }> {
    const results = await this.redoxService.searchMedicationAdministrations(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }

  @Get('patients/:patientId/medication-statements')
  async getPatientMedicationStatements(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ): Promise<{ results: MedicationStatementResult[]; total: number }> {
    const results = await this.redoxService.searchMedicationStatements(
      patientId,
      status,
    );

    return {
      results,
      total: results.length,
    };
  }
}
