import { randomUUID } from 'crypto';
import type {
  AllergyRecord,
  AllergySeverity,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirAllergyIntolerance } from '../fhir-types';

export interface MapAllergyResult {
  record: AllergyRecord;
  warnings: string[];
}

const VALID_SEVERITIES: ReadonlySet<AllergySeverity> = new Set(['mild', 'moderate', 'severe']);

export function mapAllergy(
  fhir: FhirAllergyIntolerance,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapAllergyResult {
  const warnings: string[] = [];

  const substance =
    fhir.code?.text ?? fhir.code?.coding?.[0]?.display ?? '';

  const firstReaction = fhir.reaction?.[0];
  const reaction = firstReaction?.manifestation?.[0]?.text ?? undefined;

  let severity: AllergySeverity | undefined;
  if (firstReaction?.severity && VALID_SEVERITIES.has(firstReaction.severity)) {
    severity = firstReaction.severity;
  }

  return {
    record: {
      id: randomUUID(),
      patientId: opts.patientId,
      substance,
      reaction,
      severity,
      recordedDate: fhir.recordedDate ?? '',
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    },
    warnings,
  };
}
