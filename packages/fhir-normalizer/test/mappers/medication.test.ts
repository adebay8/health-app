import { describe, it, expect } from 'vitest';
import { mapMedication } from '../../src/mappers/medication';
import type { FhirMedicationStatement } from '../../src/fhir-types';

describe('mapMedication', () => {
  const patientId = 'internal-patient-id';
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps an active RxNorm-coded medication with dosage text', () => {
    const fhir: FhirMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'particle-carlos-med-1',
      status: 'active',
      medicationCodeableConcept: {
        coding: [
          { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '6809', display: 'Metformin' },
        ],
        text: 'Metformin 500 mg',
      },
      effectivePeriod: { start: '2021-04-10' },
      dosage: [{ text: '500 mg twice daily' }],
    };

    const result = mapMedication(fhir, { patientId, source: 'particle', fetchedAt });

    expect(result.record).toMatchObject({
      patientId,
      code: '6809',
      codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
      display: 'Metformin 500 mg',
      dosage: '500 mg twice daily',
      status: 'active',
      startDate: '2021-04-10',
      providerSource: 'particle',
      providerRecordId: 'particle-carlos-med-1',
      fetchedAt,
    });
    expect(result.warnings).toEqual([]);
  });

  it('maps FHIR "stopped" to our "stopped" status', () => {
    const fhir: FhirMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'x',
      status: 'stopped',
      medicationCodeableConcept: { coding: [{ code: '1' }], text: 'Drug X' },
    };
    const result = mapMedication(fhir, { patientId, source: 'particle', fetchedAt });
    expect(result.record.status).toBe('stopped');
  });

  it('defaults status to "active" and warns when missing', () => {
    const fhir: FhirMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: 'x',
      medicationCodeableConcept: { coding: [{ code: '1' }], text: 'Drug X' },
    };
    const result = mapMedication(fhir, { patientId, source: 'particle', fetchedAt });
    expect(result.record.status).toBe('active');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
