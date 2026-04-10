import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload, ObservationRecord } from '@health-app/shared-types';

const LDL = '13457-7';
const HDL = '2085-9';
const TOTAL_CHOL = '2093-3';

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

function latest(obs: ObservationRecord[], code: string): ObservationRecord | undefined {
  return obs
    .filter((o) => o.code === code)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

export function lipidsRule(payload: NormalizedPatientPayload): InsightFlag[] {
  const flags: InsightFlag[] = [];

  const ldl = latest(payload.observations, LDL);
  if (ldl) {
    const v = Number(ldl.value);
    if (v >= 130) {
      flags.push({
        id: stableId(`ldl:${ldl.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'LDL',
        observedValue: `${v} mg/dL`,
        message: `LDL ${v} mg/dL is above the target (<100). Discuss with your provider.`,
      });
    } else if (v >= 100) {
      flags.push({
        id: stableId(`ldl:${ldl.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'LDL',
        observedValue: `${v} mg/dL`,
        message: `LDL ${v} mg/dL is near the upper limit (<100). Worth keeping an eye on.`,
      });
    }
  }

  const hdl = latest(payload.observations, HDL);
  if (hdl) {
    const v = Number(hdl.value);
    if (v < 40) {
      flags.push({
        id: stableId(`hdl:${hdl.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'HDL',
        observedValue: `${v} mg/dL`,
        message: `HDL ${v} mg/dL is below the typical target (≥40).`,
      });
    }
  }

  const total = latest(payload.observations, TOTAL_CHOL);
  if (total) {
    const v = Number(total.value);
    if (v >= 240) {
      flags.push({
        id: stableId(`total:${total.effectiveDate}:${v}`),
        severity: 'concern',
        category: 'lab',
        metric: 'Total cholesterol',
        observedValue: `${v} mg/dL`,
        message: `Total cholesterol ${v} mg/dL is high (<200).`,
      });
    } else if (v >= 200) {
      flags.push({
        id: stableId(`total:${total.effectiveDate}:${v}`),
        severity: 'watch',
        category: 'lab',
        metric: 'Total cholesterol',
        observedValue: `${v} mg/dL`,
        message: `Total cholesterol ${v} mg/dL is borderline (<200).`,
      });
    }
  }

  return flags;
}
