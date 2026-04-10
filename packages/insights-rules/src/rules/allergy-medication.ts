import { createHash } from 'crypto';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

function stableId(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

export function allergyMedicationRule(
  payload: NormalizedPatientPayload,
): InsightFlag[] {
  const flags: InsightFlag[] = [];

  for (const allergy of payload.allergies) {
    const substance = allergy.substance.trim().toLowerCase();
    if (!substance) continue;
    for (const med of payload.medications) {
      if (med.status !== 'active') continue;
      if (med.display.toLowerCase().includes(substance)) {
        flags.push({
          id: stableId(`allergy-med:${allergy.id}:${med.id}`),
          severity: 'concern',
          category: 'medication',
          metric: 'Allergy contradiction',
          message: `Active medication "${med.display}" may conflict with recorded ${allergy.substance} allergy. Confirm with your provider.`,
        });
      }
    }
  }

  return flags;
}
