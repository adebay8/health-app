import { describe, it, expect } from 'vitest';
import { mapEncounter } from '../../src/mappers/encounter';
import type { FhirEncounter } from '../../src/fhir-types';

describe('mapEncounter', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps an ambulatory encounter with reason and provider', () => {
    const fhir: FhirEncounter = {
      resourceType: 'Encounter',
      id: 'particle-sarah-enc-1',
      class: { code: 'AMB', display: 'Ambulatory' },
      type: [{ text: 'Annual physical exam' }],
      reasonCode: [{ text: 'Annual wellness visit' }],
      period: { start: '2025-11-10T09:00:00Z', end: '2025-11-10T09:45:00Z' },
      participant: [{ individual: { display: 'Dr. Anita Rao' } }],
    };

    const result = mapEncounter(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      type: 'ambulatory',
      reason: 'Annual wellness visit',
      providerName: 'Dr. Anita Rao',
      startDate: '2025-11-10T09:00:00Z',
      endDate: '2025-11-10T09:45:00Z',
      providerRecordId: 'particle-sarah-enc-1',
    });
  });

  it('maps the FHIR v3-ActCode classes EMER, IMP, VR to our buckets', () => {
    const cases: Array<[string, 'ambulatory' | 'emergency' | 'inpatient' | 'virtual']> = [
      ['AMB', 'ambulatory'],
      ['EMER', 'emergency'],
      ['IMP', 'inpatient'],
      ['VR', 'virtual'],
    ];
    for (const [code, expected] of cases) {
      const fhir: FhirEncounter = {
        resourceType: 'Encounter',
        id: 'x',
        class: { code },
        period: { start: '2025-01-01' },
      };
      const result = mapEncounter(fhir, { patientId, source: 'particle', fetchedAt });
      expect(result.record.type).toBe(expected);
    }
  });
});
