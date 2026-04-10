import { randomUUID } from 'crypto';
import type {
  EncounterRecord,
  EncounterType,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirEncounter } from '../fhir-types';

export interface MapEncounterResult {
  record: EncounterRecord;
  warnings: string[];
}

function mapType(raw: string | undefined, warnings: string[]): EncounterType {
  switch (raw) {
    case 'AMB':
      return 'ambulatory';
    case 'EMER':
      return 'emergency';
    case 'IMP':
    case 'ACUTE':
      return 'inpatient';
    case 'VR':
      return 'virtual';
    default:
      if (raw) warnings.push(`encounter class "${raw}" mapped to "ambulatory"`);
      return 'ambulatory';
  }
}

export function mapEncounter(
  fhir: FhirEncounter,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapEncounterResult {
  const warnings: string[] = [];

  const type = mapType(fhir.class?.code, warnings);
  const reason = fhir.reasonCode?.[0]?.text ?? fhir.type?.[0]?.text;
  const providerName = fhir.participant?.[0]?.individual?.display;

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      type,
      reason,
      providerName,
      startDate: fhir.period?.start ?? '',
      endDate: fhir.period?.end,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
