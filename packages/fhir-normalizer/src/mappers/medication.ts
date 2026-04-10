import { randomUUID } from 'crypto';
import type {
  MedicationRecord,
  MedicationStatus,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirMedicationStatement } from '../fhir-types';

export interface MapMedicationResult {
  record: MedicationRecord;
  warnings: string[];
}

function normalizeStatus(raw: string | undefined, warnings: string[], id: string): MedicationStatus {
  if (!raw) {
    warnings.push(`medication ${id}: status missing — defaulted to "active"`);
    return 'active';
  }
  if (raw === 'active' || raw === 'completed' || raw === 'stopped') return raw;
  if (raw === 'on-hold' || raw === 'cancelled' || raw === 'entered-in-error') {
    warnings.push(`medication ${id}: FHIR status "${raw}" mapped to "stopped"`);
    return 'stopped';
  }
  if (raw === 'intended' || raw === 'not-taken' || raw === 'unknown') {
    warnings.push(`medication ${id}: FHIR status "${raw}" mapped to "active"`);
    return 'active';
  }
  warnings.push(`medication ${id}: unknown status "${raw}" — defaulted to "active"`);
  return 'active';
}

export function mapMedication(
  fhir: FhirMedicationStatement,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapMedicationResult {
  const warnings: string[] = [];

  const coding = fhir.medicationCodeableConcept?.coding?.[0];
  const code = coding?.code ?? '';
  const codeSystem = coding?.system ?? '';
  const display = fhir.medicationCodeableConcept?.text ?? coding?.display ?? '';

  const status = normalizeStatus(fhir.status, warnings, fhir.id ?? 'unknown');

  const dosage = fhir.dosage?.[0]?.text;
  const startDate = fhir.effectivePeriod?.start ?? fhir.effectiveDateTime;
  const endDate = fhir.effectivePeriod?.end;

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      code,
      codeSystem,
      display,
      dosage,
      status,
      startDate,
      endDate,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
