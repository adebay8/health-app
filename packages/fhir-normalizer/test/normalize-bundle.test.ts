import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeBundle } from '../src';
import type { FhirBundle } from '../src/fhir-types';

function loadFixture(name: string): FhirBundle {
  const path = resolve(__dirname, '../../..', 'fixtures', 'particle', name);
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('normalizeBundle', () => {
  const fetchedAt = '2026-04-10T00:00:00Z';

  it('normalizes the Sarah fixture into a complete payload', () => {
    const bundle = loadFixture('patient-sarah.json');
    const result = normalizeBundle(bundle, { source: 'particle', fetchedAt });

    expect(result.patient.firstName).toBe('Sarah');
    expect(result.patient.lastName).toBe('Chen');
    expect(result.patient.externalIds.particle).toBe('particle-sarah-001');

    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0].display).toContain('Allergic');

    expect(result.allergies).toHaveLength(1);
    expect(result.allergies[0].substance).toBe('Penicillin');

    // BP panel splits into 2 observation records + 1 LDL lab = 3 total
    expect(result.observations).toHaveLength(3);

    expect(result.encounters).toHaveLength(1);
    expect(result.encounters[0].type).toBe('ambulatory');

    expect(result.warnings).toEqual([]);

    // Every clinical record points at the same internal patientId
    const pid = result.patient.id;
    result.conditions.forEach((c) => expect(c.patientId).toBe(pid));
    result.allergies.forEach((a) => expect(a.patientId).toBe(pid));
    result.observations.forEach((o) => expect(o.patientId).toBe(pid));
    result.encounters.forEach((e) => expect(e.patientId).toBe(pid));
  });

  it('normalizes the Carlos fixture and carries through status values', () => {
    const bundle = loadFixture('patient-carlos.json');
    const result = normalizeBundle(bundle, { source: 'particle', fetchedAt });

    expect(result.conditions.length).toBeGreaterThanOrEqual(3);
    expect(result.medications.length).toBeGreaterThanOrEqual(3);
    expect(result.medications.every((m) => m.status === 'active')).toBe(true);

    const ldl = result.observations.find((o) => o.display.includes('LDL'));
    expect(ldl?.interpretation).toBe('high');
  });

  it('returns an empty payload (with no throws) for a bundle with no entries', () => {
    const bundle: FhirBundle = { resourceType: 'Bundle', entry: [] };
    const result = normalizeBundle(bundle, { source: 'particle', fetchedAt });
    expect(result.conditions).toEqual([]);
    expect(result.patient.id).toBe('');
  });
});
