import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

const SYSTOLIC_LOINC = '8480-6';
const DIASTOLIC_LOINC = '8462-4';

function stableId(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 12);
}

interface BPReading {
  systolic: number;
  diastolic: number;
  date: string;
}

function latestBPReading(payload: NormalizedPatientPayload): BPReading | undefined {
  const systolics = payload.observations
    .filter((o) => o.code === SYSTOLIC_LOINC)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const diastolics = payload.observations
    .filter((o) => o.code === DIASTOLIC_LOINC)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const sys = systolics[0];
  const dia = diastolics.find((d) => d.effectiveDate === sys?.effectiveDate);
  if (!sys || !dia) return undefined;

  return {
    systolic: Number(sys.value),
    diastolic: Number(dia.value),
    date: sys.effectiveDate,
  };
}

export function bloodPressureRule(
  payload: NormalizedPatientPayload,
): InsightFlag[] {
  const bp = latestBPReading(payload);
  if (!bp) return [];

  const { systolic, diastolic } = bp;
  const observedValue = `${systolic}/${diastolic}`;

  let severity: 'info' | 'watch' | 'concern';
  let stageText: string;

  if (systolic >= 140 || diastolic >= 90) {
    severity = 'concern';
    stageText = 'Stage 2 hypertension';
  } else if (systolic >= 130 || diastolic >= 80) {
    severity = 'watch';
    stageText = 'Stage 1 hypertension';
  } else if (systolic >= 120) {
    severity = 'info';
    stageText = 'Elevated blood pressure';
  } else {
    return [];
  }

  return [
    {
      id: stableId(`bp:${bp.date}:${observedValue}`),
      severity,
      category: 'vital',
      metric: 'Blood pressure',
      observedValue,
      message: `${stageText} — last reading ${observedValue} mmHg on ${bp.date}`,
      anatomyRef: 'heart',
    },
  ];
}
