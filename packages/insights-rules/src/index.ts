import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';
import { bloodPressureRule } from './rules/blood-pressure';
import { lipidsRule } from './rules/lipids';
import { glucoseRule } from './rules/glucose';
import { preventiveLipidGapRule } from './rules/preventive-lipid-gap';
import { allergyMedicationRule } from './rules/allergy-medication';

export type RuleFn = (
  payload: NormalizedPatientPayload,
  now?: Date,
) => InsightFlag[];

export const ALL_RULES: RuleFn[] = [
  bloodPressureRule,
  lipidsRule,
  glucoseRule,
  preventiveLipidGapRule,
  allergyMedicationRule,
];

export function generateFlags(
  payload: NormalizedPatientPayload,
  now: Date = new Date(),
): InsightFlag[] {
  const flags: InsightFlag[] = [];
  for (const rule of ALL_RULES) {
    flags.push(...rule(payload, now));
  }
  return flags;
}

export { bloodPressureRule } from './rules/blood-pressure';
export { lipidsRule } from './rules/lipids';
export { glucoseRule } from './rules/glucose';
export { preventiveLipidGapRule } from './rules/preventive-lipid-gap';
export { allergyMedicationRule } from './rules/allergy-medication';
