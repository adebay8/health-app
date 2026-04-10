import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

const A1C = '4548-4';
const FASTING_GLUCOSE = '1558-6';

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

function latest(obs: ObservationRecord[], code: string): ObservationRecord | undefined {
  return obs
    .filter((o) => o.code === code)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

export function glucoseRule(payload: NormalizedPatientPayload): InsightFlag[] {
  const flags: InsightFlag[] = [];

  const a1c = latest(payload.observations, A1C);
  if (a1c) {
    const v = Number(a1c.value);
    if (v >= 6.5) {
      flags.push({
        id: stableId(`a1c:${a1c.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'A1C',
        observedValue: `${v} %`,
        message: `A1C ${v}% is in the diabetes range (≥6.5%). Discuss with your provider.`,
      });
    } else if (v >= 5.7) {
      flags.push({
        id: stableId(`a1c:${a1c.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'A1C',
        observedValue: `${v} %`,
        message: `A1C ${v}% is in the prediabetes range (5.7-6.4%).`,
      });
    }
  }

  const glucose = latest(payload.observations, FASTING_GLUCOSE);
  if (glucose) {
    const v = Number(glucose.value);
    if (v >= 126) {
      flags.push({
        id: stableId(`glu:${glucose.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'Fasting glucose',
        observedValue: `${v} mg/dL`,
        message: `Fasting glucose ${v} mg/dL is in the diabetes range (≥126).`,
      });
    } else if (v >= 100) {
      flags.push({
        id: stableId(`glu:${glucose.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'Fasting glucose',
        observedValue: `${v} mg/dL`,
        message: `Fasting glucose ${v} mg/dL is in the impaired fasting glucose range (100-125).`,
      });
    }
  }

  return flags;
}
