import { describe, it, expect } from 'vitest';
import { lipidsRule } from '../../src/rules/lipids';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function labObs(code: string, display: string, value: string): ObservationRecord {
  return {
    id: crypto.randomUUID(),
    patientId: 'p',
    category: 'lab',
    code,
    codeSystem: 'http://loinc.org',
    display,
    value,
    unit: 'mg/dL',
    effectiveDate: '2025-11-10',
    providerSource: 'particle',
    providerRecordId: 'x',
    fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(obs: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications: [], allergies: [],
    observations: obs, encounters: [], warnings: [],
  };
}

describe('lipidsRule', () => {
  it('flags LDL above 130 as concern', () => {
    const flags = lipidsRule(payload([labObs('13457-7', 'LDL Cholesterol', '148')]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'concern',
      category: 'lab',
      metric: 'LDL',
      observedValue: '148 mg/dL',
    });
  });

  it('flags LDL 100-129 as watch', () => {
    const flags = lipidsRule(payload([labObs('13457-7', 'LDL Cholesterol', '118')]));
    expect(flags[0].severity).toBe('watch');
  });

  it('does not flag LDL under 100', () => {
    expect(lipidsRule(payload([labObs('13457-7', 'LDL', '92')]))).toEqual([]);
  });

  it('flags HDL below 40 as watch', () => {
    const flags = lipidsRule(payload([labObs('2085-9', 'HDL Cholesterol', '32')]));
    expect(flags[0]).toMatchObject({ metric: 'HDL', severity: 'watch' });
  });

  it('flags total cholesterol above 240 as concern', () => {
    const flags = lipidsRule(payload([labObs('2093-3', 'Total Cholesterol', '255')]));
    expect(flags[0]).toMatchObject({ metric: 'Total cholesterol', severity: 'concern' });
  });
});
