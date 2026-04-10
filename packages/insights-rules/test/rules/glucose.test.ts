import { describe, it, expect } from 'vitest';
import { glucoseRule } from '../../src/rules/glucose';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function obs(code: string, display: string, value: string, unit: string): ObservationRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p', category: 'lab',
    code, codeSystem: 'http://loinc.org', display, value, unit,
    effectiveDate: '2025-11-10', providerSource: 'particle',
    providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(observations: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications: [], allergies: [],
    observations, encounters: [], warnings: [],
  };
}

describe('glucoseRule', () => {
  it('flags A1C >= 6.5% as concern (diabetes range)', () => {
    const flags = glucoseRule(payload([obs('4548-4', 'Hemoglobin A1C', '7.8', '%')]));
    expect(flags[0]).toMatchObject({ severity: 'concern', metric: 'A1C', observedValue: '7.8 %' });
  });

  it('flags A1C 5.7-6.4% as watch (prediabetes)', () => {
    const flags = glucoseRule(payload([obs('4548-4', 'Hemoglobin A1C', '6.0', '%')]));
    expect(flags[0].severity).toBe('watch');
  });

  it('flags fasting glucose >= 126 as concern', () => {
    const flags = glucoseRule(payload([obs('1558-6', 'Fasting glucose', '165', 'mg/dL')]));
    expect(flags[0]).toMatchObject({ severity: 'concern', metric: 'Fasting glucose' });
  });

  it('flags fasting glucose 100-125 as watch (impaired fasting glucose)', () => {
    const flags = glucoseRule(payload([obs('1558-6', 'Fasting glucose', '110', 'mg/dL')]));
    expect(flags[0].severity).toBe('watch');
  });

  it('does not flag normal values', () => {
    expect(glucoseRule(payload([obs('4548-4', 'A1C', '5.2', '%')]))).toEqual([]);
  });
});
