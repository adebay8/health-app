import { describe, it, expect } from 'vitest';
import { preventiveLipidGapRule } from '../../src/rules/preventive-lipid-gap';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function ldl(date: string, value = '92'): ObservationRecord {
  return {
    id: crypto.randomUUID(), patientId: 'p', category: 'lab',
    code: '13457-7', codeSystem: 'http://loinc.org', display: 'LDL',
    value, unit: 'mg/dL', effectiveDate: date,
    providerSource: 'particle', providerRecordId: 'x', fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(observations: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: { id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'male', externalIds: {} },
    conditions: [], medications: [], allergies: [],
    observations, encounters: [], warnings: [],
  };
}

describe('preventiveLipidGapRule', () => {
  const now = new Date('2026-04-10T00:00:00Z');

  it('flags when no lipid panel exists at all', () => {
    const flags = preventiveLipidGapRule(payload([]), now);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'info',
      category: 'gap',
      message: expect.stringContaining('lipid panel'),
    });
  });

  it('flags when most recent LDL is older than 12 months', () => {
    const flags = preventiveLipidGapRule(payload([ldl('2024-01-01')]), now);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('info');
  });

  it('does not flag when most recent LDL is within 12 months', () => {
    expect(preventiveLipidGapRule(payload([ldl('2025-08-01')]), now)).toEqual([]);
  });
});
