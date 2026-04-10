import { randomUUID } from 'crypto';
import type { Gender, PatientRecord, ProviderSource } from '@health-app/shared-types';
import type { FhirPatient } from '../fhir-types';

export interface MapPatientResult {
  record: PatientRecord;
  warnings: string[];
}

const VALID_GENDERS: ReadonlySet<Gender> = new Set(['male', 'female', 'other', 'unknown']);

export function mapPatient(
  fhir: FhirPatient,
  opts: { source: ProviderSource; fetchedAt: string },
): MapPatientResult {
  const warnings: string[] = [];

  const given = fhir.name?.[0]?.given ?? [];
  const family = fhir.name?.[0]?.family ?? '';
  const firstName = given.join(' ').trim();
  const lastName = family.trim();

  let gender: Gender = 'unknown';
  if (fhir.gender) {
    if (VALID_GENDERS.has(fhir.gender as Gender)) {
      gender = fhir.gender as Gender;
    } else {
      warnings.push(`patient.gender: unknown value "${fhir.gender}" — defaulted to "unknown"`);
    }
  }

  const email = fhir.telecom?.find((t) => t.system === 'email')?.value;
  const phoneNumber = fhir.telecom?.find((t) => t.system === 'phone')?.value;

  const externalIds: PatientRecord['externalIds'] = {};
  if (fhir.id) externalIds[opts.source as 'particle' | 'redox'] = fhir.id;

  return {
    record: {
      id: randomUUID(),
      firstName,
      lastName,
      dateOfBirth: fhir.birthDate ?? '',
      gender,
      email,
      phoneNumber,
      externalIds,
    },
    warnings,
  };
}
