import { randomUUID } from 'crypto';
import type {
  ObservationCategory,
  ObservationInterpretation,
  ObservationRecord,
  ProviderSource,
} from '@health-app/shared-types';
import type { FhirObservation } from '../fhir-types';
import { resolveAnatomyRef } from '../anatomy/body-site-map';

export interface MapObservationResult {
  records: ObservationRecord[];
  warnings: string[];
}

function mapCategory(raw: string | undefined): ObservationCategory {
  if (raw === 'vital-signs') return 'vital-sign';
  return 'lab';
}

function mapInterpretation(raw: string | undefined): ObservationInterpretation | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase();
  if (u === 'N') return 'normal';
  if (u === 'H') return 'high';
  if (u === 'L') return 'low';
  if (u === 'HH' || u === 'LL' || u === 'CRITICAL') return 'critical';
  return undefined;
}

export function mapObservation(
  fhir: FhirObservation,
  opts: { patientId: string; source: ProviderSource; fetchedAt: string },
): MapObservationResult {
  const warnings: string[] = [];
  const records: ObservationRecord[] = [];

  const category = mapCategory(fhir.category?.[0]?.coding?.[0]?.code);
  const effectiveDate = fhir.effectiveDateTime ?? '';
  const interpretation = mapInterpretation(fhir.interpretation?.[0]?.coding?.[0]?.code);
  const anatomyRef = resolveAnatomyRef(fhir.bodySite);

  const components = fhir.component ?? [];

  if (components.length > 0) {
    for (const comp of components) {
      const compCoding = comp.code?.coding?.[0];
      records.push({
        id: randomUUID(),
        patientId: opts.patientId,
        category,
        code: compCoding?.code ?? '',
        codeSystem: compCoding?.system ?? 'http://loinc.org',
        display: compCoding?.display ?? '',
        value: comp.valueQuantity?.value?.toString() ?? '',
        unit: comp.valueQuantity?.unit,
        effectiveDate,
        anatomyRef,
        providerSource: opts.source,
        providerRecordId: `${fhir.id ?? ''}:${compCoding?.code ?? ''}`,
        fetchedAt: opts.fetchedAt,
        rawSnapshot: { parent: fhir.id, component: comp },
      });
    }
  } else {
    const coding = fhir.code?.coding?.[0];
    records.push({
      id: randomUUID(),
      patientId: opts.patientId,
      category,
      code: coding?.code ?? '',
      codeSystem: coding?.system ?? '',
      display: fhir.code?.text ?? coding?.display ?? '',
      value:
        fhir.valueQuantity?.value?.toString() ?? fhir.valueString ?? '',
      unit: fhir.valueQuantity?.unit,
      referenceRangeLow: fhir.referenceRange?.[0]?.low?.value,
      referenceRangeHigh: fhir.referenceRange?.[0]?.high?.value,
      interpretation,
      effectiveDate,
      anatomyRef,
      providerSource: opts.source,
      providerRecordId: fhir.id ?? '',
      fetchedAt: opts.fetchedAt,
      rawSnapshot: fhir,
    });
  }

  return { records, warnings };
}
