import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeBundle, type FhirBundle } from '@health-app/fhir-normalizer';
import type {
  AllergyRecord, ConditionRecord, EncounterRecord,
  MedicationRecord, NormalizedPatientPayload, ObservationRecord,
  PatientRecord, PatientSummary,
} from '@health-app/shared-types';

import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Condition) private readonly conditions: Repository<Condition>,
    @InjectRepository(Medication) private readonly medications: Repository<Medication>,
    @InjectRepository(Allergy) private readonly allergies: Repository<Allergy>,
    @InjectRepository(Observation) private readonly observations: Repository<Observation>,
    @InjectRepository(Encounter) private readonly encounters: Repository<Encounter>,
  ) {}

  async listPatients(): Promise<PatientSummary[]> {
    const rows = await this.patients.find({ where: { isActive: true } });
    return rows.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender as any,
    }));
  }

  async getPatientPayload(patientId: string): Promise<NormalizedPatientPayload> {
    const patient = await this.patients.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    const [conditions, medications, allergies, observations, encounters] = await Promise.all([
      this.conditions.find({ where: { patientId } }),
      this.medications.find({ where: { patientId } }),
      this.allergies.find({ where: { patientId } }),
      this.observations.find({ where: { patientId } }),
      this.encounters.find({ where: { patientId } }),
    ]);

    const patientRecord: PatientRecord = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender as any,
      email: patient.email || undefined,
      phoneNumber: patient.phoneNumber || undefined,
      externalIds: patient.externalIds ?? {},
    };

    return {
      patient: patientRecord,
      conditions: conditions as unknown as ConditionRecord[],
      medications: medications as unknown as MedicationRecord[],
      allergies: allergies as unknown as AllergyRecord[],
      observations: observations as unknown as ObservationRecord[],
      encounters: encounters as unknown as EncounterRecord[],
      warnings: [],
    };
  }

  async refreshFromFixture(patientId: string): Promise<NormalizedPatientPayload> {
    const patient = await this.patients.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    const particleId = patient.externalIds?.particle;
    if (!particleId) throw new NotFoundException(`Patient has no particle externalId`);

    const filename = `patient-${patient.firstName.toLowerCase()}.json`;
    const path = resolve(process.cwd(), '../../fixtures/particle', filename);
    const bundle: FhirBundle = JSON.parse(readFileSync(path, 'utf8'));
    const normalized = normalizeBundle(bundle, {
      source: 'particle',
      fetchedAt: new Date().toISOString(),
    });

    this.logger.log(`Refreshed patient ${patientId} from ${filename} (${normalized.warnings.length} warnings)`);
    return this.getPatientPayload(patientId);
  }
}
