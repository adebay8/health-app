import { describe, it, expect } from 'vitest';
import { allergyMedicationRule } from '../../src/rules/allergy-medication';
import type {
  AllergyRecord, MedicationRecord, NormalizedPatientPayload,
} from '@health-app/shared-types';

function allergy(substance: string): AllergyRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p', substance,
    severity: 'moderate', recordedDate: '2020-01-01',
    providerSource: 'particle', providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function med(display: string, status: 'active' | 'stopped' = 'active'): MedicationRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p',
    code: '1', codeSystem: 'rxnorm', display,
    status,
    providerSource: 'particle', providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(allergies: AllergyRecord[], medications: MedicationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications, allergies,
    observations: [], encounters: [], warnings: [],
  };
}

describe('allergyMedicationRule', () => {
  it('flags an active medication whose display contains an allergen', () => {
    const flags = allergyMedicationRule(payload([allergy('Penicillin')], [med('Penicillin VK 250 mg')]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'concern',
      category: 'medication',
      message: expect.stringContaining('Penicillin'),
    });
  });

  it('does not flag stopped medications', () => {
    expect(
      allergyMedicationRule(payload([allergy('Penicillin')], [med('Penicillin VK', 'stopped')])),
    ).toEqual([]);
  });

  it('does not flag when no allergy matches', () => {
    expect(
      allergyMedicationRule(payload([allergy('Sulfa')], [med('Metformin 500 mg')])),
    ).toEqual([]);
  });
});
