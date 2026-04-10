import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeBundle } from '@health-app/fhir-normalizer';
import type { FhirBundle } from '@health-app/fhir-normalizer';

import { Patient } from '../patients/entities/patient.entity';
import { Condition } from '../clinical/entities/condition.entity';
import { Medication } from '../clinical/entities/medication.entity';
import { Allergy } from '../clinical/entities/allergy.entity';
import { Observation } from '../clinical/entities/observation.entity';
import { Encounter } from '../clinical/entities/encounter.entity';

const FIXTURE_FILES = [
  'patient-sarah.json',
  'patient-carlos.json',
  'patient-mia.json',
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Condition) private readonly conditions: Repository<Condition>,
    @InjectRepository(Medication) private readonly medications: Repository<Medication>,
    @InjectRepository(Allergy) private readonly allergies: Repository<Allergy>,
    @InjectRepository(Observation) private readonly observations: Repository<Observation>,
    @InjectRepository(Encounter) private readonly encounters: Repository<Encounter>,
  ) {}

  async seed(): Promise<void> {
    const fetchedAt = new Date().toISOString();
    const fixturesDir = resolve(process.cwd(), '../../fixtures/particle');

    await this.clear();

    for (const filename of FIXTURE_FILES) {
      const path = resolve(fixturesDir, filename);
      this.logger.log(`Loading fixture: ${path}`);
      const bundle: FhirBundle = JSON.parse(readFileSync(path, 'utf8'));
      const normalized = normalizeBundle(bundle, { source: 'particle', fetchedAt });

      if (normalized.warnings.length > 0) {
        this.logger.warn(`Warnings for ${filename}: ${JSON.stringify(normalized.warnings)}`);
      }

      await this.persistPayload(normalized);
      this.logger.log(`Seeded ${normalized.patient.firstName} ${normalized.patient.lastName}`);
    }
  }

  private async clear(): Promise<void> {
    // Order matters: clinical records reference patients.
    await this.conditions.clear();
    await this.medications.clear();
    await this.allergies.clear();
    await this.observations.clear();
    await this.encounters.clear();
    await this.patients.clear();
  }

  private async persistPayload(
    p: ReturnType<typeof normalizeBundle>,
  ): Promise<void> {
    const savedPatient = await this.patients.save(
      this.patients.create({
        id: p.patient.id,
        firstName: p.patient.firstName,
        lastName: p.patient.lastName,
        dateOfBirth: p.patient.dateOfBirth,
        gender: p.patient.gender as any,
        email: p.patient.email ?? '',
        phoneNumber: p.patient.phoneNumber ?? '',
        externalIds: p.patient.externalIds,
      }),
    );

    if (p.conditions.length) {
      await this.conditions.save(p.conditions.map((c) => ({ ...c, patientId: savedPatient.id })));
    }
    if (p.medications.length) {
      await this.medications.save(p.medications.map((m) => ({ ...m, patientId: savedPatient.id })));
    }
    if (p.allergies.length) {
      await this.allergies.save(p.allergies.map((a) => ({ ...a, patientId: savedPatient.id })));
    }
    if (p.observations.length) {
      await this.observations.save(p.observations.map((o) => ({ ...o, patientId: savedPatient.id })));
    }
    if (p.encounters.length) {
      await this.encounters.save(p.encounters.map((e) => ({ ...e, patientId: savedPatient.id })));
    }
  }
}
