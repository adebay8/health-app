import { describe, it, expect } from 'vitest';
import { mapPatient } from '../../src/mappers/patient';
import type { FhirPatient } from '../../src/fhir-types';

describe('mapPatient', () => {
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('maps a fully-populated FHIR Patient to a PatientRecord', () => {
    const fhir: FhirPatient = {
      resourceType: 'Patient',
      id: 'particle-sarah-001',
      name: [{ given: ['Sarah'], family: 'Chen' }],
      birthDate: '1997-06-12',
      gender: 'female',
      telecom: [
        { system: 'email', value: 'sarah.chen@example.com' },
        { system: 'phone', value: '+15551234567' },
      ],
    };

    const result = mapPatient(fhir, { source: 'particle', fetchedAt });

    expect(result.record).toEqual({
      id: expect.any(String),
      firstName: 'Sarah',
      lastName: 'Chen',
      dateOfBirth: '1997-06-12',
      gender: 'female',
      email: 'sarah.chen@example.com',
      phoneNumber: '+15551234567',
      externalIds: { particle: 'particle-sarah-001' },
    });
    expect(result.warnings).toEqual([]);
  });

  it('normalizes unknown gender values to "unknown"', () => {
    const fhir: FhirPatient = {
      resourceType: 'Patient',
      id: 'x',
      name: [{ given: ['A'], family: 'B' }],
      birthDate: '2000-01-01',
      gender: 'not-a-valid-value',
    };

    const result = mapPatient(fhir, { source: 'particle', fetchedAt });

    expect(result.record.gender).toBe('unknown');
    expect(result.warnings).toContain('patient.gender: unknown value "not-a-valid-value" — defaulted to "unknown"');
  });

  it('leaves email and phone undefined if telecom is missing', () => {
    const fhir: FhirPatient = {
      resourceType: 'Patient',
      id: 'x',
      name: [{ given: ['A'], family: 'B' }],
      birthDate: '2000-01-01',
      gender: 'male',
    };

    const result = mapPatient(fhir, { source: 'particle', fetchedAt });

    expect(result.record.email).toBeUndefined();
    expect(result.record.phoneNumber).toBeUndefined();
  });
});
