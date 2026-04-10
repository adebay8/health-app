import { describe, it, expect } from 'vitest';
import { mapCondition } from '../../src/mappers/condition';
import type { FhirCondition } from '../../src/fhir-types';

describe('mapCondition', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps an active condition with a SNOMED code and body site', () => {
    const fhir: FhirCondition = {
      resourceType: 'Condition',
      id: 'particle-carlos-cond-1',
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertensive disorder' }],
        text: 'Hypertension',
      },
      clinicalStatus: { coding: [{ code: 'active', display: 'Active' }] },
      recordedDate: '2020-03-12',
      onsetDateTime: '2019-12-01',
      bodySite: [{ text: 'heart' }],
    };

    const result = mapCondition(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      code: '38341003',
      codeSystem: 'http://snomed.info/sct',
      display: 'Hypertension',
      clinicalStatus: 'active',
      onsetDate: '2019-12-01',
      recordedDate: '2020-03-12',
      anatomyRef: 'heart',
      providerSource: 'particle',
      providerRecordId: 'particle-carlos-cond-1',
      fetchedAt,
    });
    expect(result.warnings).toEqual([]);
  });

  it('defaults clinicalStatus to "active" and warns when missing', () => {
    const fhir: FhirCondition = {
      resourceType: 'Condition',
      id: 'x',
      code: { coding: [{ code: '1' }], text: 'Something' },
      recordedDate: '2020-01-01',
    };

    const result = mapCondition(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record.clinicalStatus).toBe('active');
    expect(result.warnings.some((w) => w.includes('clinicalStatus'))).toBe(true);
  });

  it('returns undefined anatomyRef when bodySite is absent', () => {
    const fhir: FhirCondition = {
      resourceType: 'Condition',
      id: 'x',
      code: { coding: [{ code: '1' }], text: 'Something' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      recordedDate: '2020-01-01',
    };

    const result = mapCondition(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record.anatomyRef).toBeUndefined();
  });
});
