import type {
  AllergyRecord,
  ConditionRecord,
  EncounterRecord,
  MedicationRecord,
  NormalizedPatientPayload,
  ObservationRecord,
  PatientRecord,
  ProviderSource,
} from '@health-app/shared-types';
import type {
  FhirAllergyIntolerance,
  FhirBundle,
  FhirCondition,
  FhirEncounter,
  FhirMedicationStatement,
  FhirObservation,
  FhirPatient,
} from './fhir-types';
import { mapPatient } from './mappers/patient';
import { mapCondition } from './mappers/condition';
import { mapMedication } from './mappers/medication';
import { mapAllergy } from './mappers/allergy';
import { mapObservation } from './mappers/observation';
import { mapEncounter } from './mappers/encounter';

export * from './fhir-types';
export { mapPatient } from './mappers/patient';
export { mapCondition } from './mappers/condition';
export { mapMedication } from './mappers/medication';
export { mapAllergy } from './mappers/allergy';
export { mapObservation } from './mappers/observation';
export { mapEncounter } from './mappers/encounter';

export interface NormalizeOptions {
  source: ProviderSource;
  fetchedAt: string;
}

const EMPTY_PATIENT: PatientRecord = {
  id: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'unknown',
  externalIds: {},
};

export function normalizeBundle(
  bundle: FhirBundle,
  opts: NormalizeOptions,
): NormalizedPatientPayload {
  const warnings: string[] = [];
  const conditions: ConditionRecord[] = [];
  const medications: MedicationRecord[] = [];
  const allergies: AllergyRecord[] = [];
  const observations: ObservationRecord[] = [];
  const encounters: EncounterRecord[] = [];

  let patient: PatientRecord = EMPTY_PATIENT;

  // First pass: find the Patient so we know our internal patientId.
  const patientEntry = bundle.entry?.find(
    (e) => e.resource?.resourceType === 'Patient',
  );
  if (patientEntry?.resource) {
    const res = mapPatient(patientEntry.resource as FhirPatient, opts);
    patient = res.record;
    warnings.push(...res.warnings);
  } else {
    warnings.push('bundle: no Patient resource found');
  }

  // Second pass: map every other resource, attaching to the patient.
  for (const entry of bundle.entry ?? []) {
    const r = entry.resource;
    if (!r) continue;
    switch (r.resourceType) {
      case 'Patient':
        break; // already handled
      case 'Condition': {
        const { record, warnings: ws } = mapCondition(r as FhirCondition, {
          patientId: patient.id,
          ...opts,
        });
        conditions.push(record);
        warnings.push(...ws);
        break;
      }
      case 'MedicationStatement':
      case 'MedicationRequest': {
        const { record, warnings: ws } = mapMedication(
          r as FhirMedicationStatement,
          { patientId: patient.id, ...opts },
        );
        medications.push(record);
        warnings.push(...ws);
        break;
      }
      case 'AllergyIntolerance': {
        const { record, warnings: ws } = mapAllergy(
          r as FhirAllergyIntolerance,
          { patientId: patient.id, ...opts },
        );
        allergies.push(record);
        warnings.push(...ws);
        break;
      }
      case 'Observation': {
        const { records, warnings: ws } = mapObservation(
          r as FhirObservation,
          { patientId: patient.id, ...opts },
        );
        observations.push(...records);
        warnings.push(...ws);
        break;
      }
      case 'Encounter': {
        const { record, warnings: ws } = mapEncounter(r as FhirEncounter, {
          patientId: patient.id,
          ...opts,
        });
        encounters.push(record);
        warnings.push(...ws);
        break;
      }
      default:
        warnings.push(`bundle: skipped unsupported resourceType "${r.resourceType}"`);
    }
  }

  return {
    patient,
    conditions,
    medications,
    allergies,
    observations,
    encounters,
    warnings,
  };
}
