import { randomUUID } from 'crypto';
import type {
  ConditionClinicalStatus,
  ConditionRecord,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirCondition } from '../fhir-types';
import { resolveAnatomyRef } from '../anatomy/body-site-map';

export interface MapConditionResult {
  record: ConditionRecord;
  warnings: string[];
}

const VALID_STATUSES: ReadonlySet<ConditionClinicalStatus> = new Set([
  'active',
  'resolved',
  'inactive',
]);

export function mapCondition(
  fhir: FhirCondition,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapConditionResult {
  const warnings: string[] = [];

  const coding = fhir.code?.coding?.[0];
  const code = coding?.code ?? '';
  const codeSystem = coding?.system ?? '';
  const display = fhir.code?.text ?? coding?.display ?? '';

  let clinicalStatus: ConditionClinicalStatus = 'active';
  const rawStatus = fhir.clinicalStatus?.coding?.[0]?.code;
  if (!rawStatus) {
    warnings.push(`condition ${fhir.id}: clinicalStatus missing — defaulted to "active"`);
  } else if (VALID_STATUSES.has(rawStatus as ConditionClinicalStatus)) {
    clinicalStatus = rawStatus as ConditionClinicalStatus;
  } else {
    warnings.push(`condition ${fhir.id}: unknown clinicalStatus "${rawStatus}" — defaulted to "active"`);
  }

  const anatomyRef = resolveAnatomyRef(fhir.bodySite?.[0]);

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      code,
      codeSystem,
      display,
      clinicalStatus,
      onsetDate: fhir.onsetDateTime,
      recordedDate: fhir.recordedDate ?? '',
      anatomyRef,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
