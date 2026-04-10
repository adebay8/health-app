import { describe, it, expect } from 'vitest';
import { mapAllergy } from '../../src/mappers/allergy';
import type { FhirAllergyIntolerance } from '../../src/fhir-types';

describe('mapAllergy', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps a penicillin allergy with severity and reaction text', () => {
    const fhir: FhirAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'particle-sarah-allergy-1',
      code: {
        coding: [{ code: '7984', display: 'Penicillin G' }],
        text: 'Penicillin',
      },
      recordedDate: '2018-09-02',
      reaction: [
        { manifestation: [{ text: 'Hives' }], severity: 'moderate' },
      ],
    };

    const result = mapAllergy(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      substance: 'Penicillin',
      reaction: 'Hives',
      severity: 'moderate',
      recordedDate: '2018-09-02',
      providerRecordId: 'particle-sarah-allergy-1',
    });
    expect(result.warnings).toEqual([]);
  });

  it('leaves severity undefined when missing (FHIR reaction.severity is optional)', () => {
    const fhir: FhirAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'x',
      code: { text: 'Peanut' },
      recordedDate: '2020-01-01',
    };
    const result = mapAllergy(fhir, { patientId, source: 'particle', fetchedAt });
    expect(result.record.severity).toBeUndefined();
  });
});
