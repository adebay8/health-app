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

// TypeORM hydrates `datetime` columns as Date instances even when the TS type
// says `string`. The rules engine expects strings (and uses `===` and
// `localeCompare` on them), so we coerce at the boundary.
function toIsoString(v: string | Date | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return v.toISOString();
  return v;
}

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
      conditions: conditions.map((c) => ({
        ...c,
        onsetDate: toIsoString(c.onsetDate),
        recordedDate: toIsoString(c.recordedDate) ?? '',
        fetchedAt: toIsoString(c.fetchedAt) ?? '',
      })) as unknown as ConditionRecord[],
      medications: medications.map((m) => ({
        ...m,
        startDate: toIsoString(m.startDate),
        endDate: toIsoString(m.endDate),
        fetchedAt: toIsoString(m.fetchedAt) ?? '',
      })) as unknown as MedicationRecord[],
      allergies: allergies.map((a) => ({
        ...a,
        recordedDate: toIsoString(a.recordedDate) ?? '',
        fetchedAt: toIsoString(a.fetchedAt) ?? '',
      })) as unknown as AllergyRecord[],
      observations: observations.map((o) => ({
        ...o,
        effectiveDate: toIsoString(o.effectiveDate) ?? '',
        fetchedAt: toIsoString(o.fetchedAt) ?? '',
      })) as unknown as ObservationRecord[],
      encounters: encounters.map((e) => ({
        ...e,
        startDate: toIsoString(e.startDate) ?? '',
        endDate: toIsoString(e.endDate),
        fetchedAt: toIsoString(e.fetchedAt) ?? '',
      })) as unknown as EncounterRecord[],
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
