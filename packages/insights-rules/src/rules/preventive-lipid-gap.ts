import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

const LIPID_CODES = new Set(['13457-7', '2085-9', '2093-3']); // LDL, HDL, total

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

export function preventiveLipidGapRule(
  payload: NormalizedPatientPayload,
  now: Date = new Date(),
): InsightFlag[] {
  const lipids = payload.observations.filter((o) => LIPID_CODES.has(o.code));

  if (lipids.length === 0) {
    return [
      {
        id: stableId('gap:lipid:never'),
        severity: 'info',
        category: 'gap',
        metric: 'Lipid panel',
        message: 'No lipid panel on record. Consider discussing annual lipid screening with your provider.',
      },
    ];
  }

  const mostRecent = lipids
    .map((o) => new Date(o.effectiveDate))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  if (mostRecent < twelveMonthsAgo) {
    const dateStr = mostRecent.toISOString().slice(0, 10);
    return [
      {
        id: stableId(`gap:lipid:${dateStr}`),
        severity: 'info',
        category: 'gap',
        metric: 'Lipid panel',
        message: `Last lipid panel was ${dateStr}. Consider scheduling an annual check.`,
      },
    ];
  }

  return [];
}
