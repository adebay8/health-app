import { describe, it, expect } from 'vitest';
import { mapObservation } from '../../src/mappers/observation';
import type { FhirObservation } from '../../src/fhir-types';

describe('mapObservation', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps a lab observation (LDL) with reference range and interpretation', () => {
    const fhir: FhirObservation = {
      resourceType: 'Observation',
      id: 'particle-carlos-obs-1',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: {
        coding: [{ system: 'http://loinc.org', code: '13457-7', display: 'LDL Cholesterol' }],
        text: 'LDL Cholesterol',
      },
      effectiveDateTime: '2025-11-10',
      valueQuantity: { value: 148, unit: 'mg/dL' },
      referenceRange: [{ low: { value: 0 }, high: { value: 100 } }],
      interpretation: [{ coding: [{ code: 'H', display: 'High' }] }],
    };

    const result = mapObservation(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      patientId,
      category: 'lab',
      code: '13457-7',
      display: 'LDL Cholesterol',
      value: '148',
      unit: 'mg/dL',
      referenceRangeLow: 0,
      referenceRangeHigh: 100,
      interpretation: 'high',
      effectiveDate: '2025-11-10',
    });
  });

  it('maps a vital-signs blood pressure panel into TWO observation records', () => {
    const fhir: FhirObservation = {
      resourceType: 'Observation',
      id: 'particle-carlos-obs-4',
      status: 'final',
      category: [{ coding: [{ code: 'vital-signs' }] }],
      code: {
        coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }],
      },
      effectiveDateTime: '2025-11-10',
      component: [
        {
          code: { coding: [{ code: '8480-6', display: 'Systolic' }] },
          valueQuantity: { value: 142, unit: 'mmHg' },
        },
        {
          code: { coding: [{ code: '8462-4', display: 'Diastolic' }] },
          valueQuantity: { value: 88, unit: 'mmHg' },
        },
      ],
    };

    const result = mapObservation(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      category: 'vital-sign',
      code: '8480-6',
      display: 'Systolic',
      value: '142',
      unit: 'mmHg',
    });
    expect(result.records[1]).toMatchObject({
      category: 'vital-sign',
      code: '8462-4',
      display: 'Diastolic',
      value: '88',
      unit: 'mmHg',
    });
  });

  it('maps FHIR interpretation codes to our buckets', () => {
    const cases: Array<[string, 'normal' | 'low' | 'high' | 'critical']> = [
      ['N', 'normal'],
      ['H', 'high'],
      ['HH', 'critical'],
      ['L', 'low'],
      ['LL', 'critical'],
    ];
    for (const [fhirCode, expected] of cases) {
      const fhir: FhirObservation = {
        resourceType: 'Observation',
        id: 'x',
        category: [{ coding: [{ code: 'laboratory' }] }],
        code: { coding: [{ code: '1' }], text: 'X' },
        effectiveDateTime: '2025-01-01',
        valueQuantity: { value: 1, unit: 'u' },
        interpretation: [{ coding: [{ code: fhirCode }] }],
      };
      const result = mapObservation(fhir, { patientId, source: 'particle', fetchedAt });
      expect(result.records[0].interpretation).toBe(expected);
    }
  });
});
