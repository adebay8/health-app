import { describe, it, expect } from 'vitest';
import { bloodPressureRule } from '../../src/rules/blood-pressure';
import type { NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

function obs(code: string, value: string, date = '2025-11-10'): ObservationRecord {
  return {
    id: crypto.randomUUID(),
    patientId: 'p',
    category: 'vital-sign',
    code,
    codeSystem: 'http://loinc.org',
    display: code === '8480-6' ? 'Systolic' : 'Diastolic',
    value,
    unit: 'mmHg',
    effectiveDate: date,
    providerSource: 'particle',
    providerRecordId: 'x',
    fetchedAt: '2026-04-10T00:00:00Z',
  };
}

function payload(observations: ObservationRecord[]): NormalizedPatientPayload {
  return {
    patient: {
      id: 'p', firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01',
      gender: 'male', externalIds: {},
    },
    conditions: [], medications: [], allergies: [],
    observations, encounters: [], warnings: [],
  };
}

describe('bloodPressureRule', () => {
  it('returns no flag for normal BP (118/76)', () => {
    const flags = bloodPressureRule(payload([obs('8480-6', '118'), obs('8462-4', '76')]));
    expect(flags).toEqual([]);
  });

  it('flags stage 1 hypertension (138/86)', () => {
    const flags = bloodPressureRule(payload([obs('8480-6', '138'), obs('8462-4', '86')]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      severity: 'watch',
      category: 'vital',
      metric: 'Blood pressure',
      observedValue: '138/86',
      anatomyRef: 'heart',
    });
    expect(flags[0].message).toContain('Stage 1');
  });

  it('flags stage 2 hypertension (152/94) as "concern"', () => {
    const flags = bloodPressureRule(payload([obs('8480-6', '152'), obs('8462-4', '94')]));
    expect(flags[0].severity).toBe('concern');
    expect(flags[0].message).toContain('Stage 2');
  });

  it('uses only the most recent BP reading when multiple exist', () => {
    const flags = bloodPressureRule(
      payload([
        obs('8480-6', '118', '2023-01-01'),
        obs('8462-4', '76', '2023-01-01'),
        obs('8480-6', '152', '2025-11-10'),
        obs('8462-4', '94', '2025-11-10'),
      ]),
    );
    expect(flags[0].severity).toBe('concern');
  });

  it('returns no flag when BP readings are missing', () => {
    expect(bloodPressureRule(payload([]))).toEqual([]);
  });
});
