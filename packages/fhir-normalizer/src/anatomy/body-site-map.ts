import { AnatomyRef } from '@health-app/shared-types';

// Map common SNOMED bodySite codes to our canonical AnatomyRef enum.
// This is intentionally small for MVP — extend as fixtures expose new codes.
const SNOMED_TO_ANATOMY: Record<string, AnatomyRef> = {
  '80891009': 'heart',           // Heart structure
  '39607008': 'lungs',            // Lung structure
  '10200004': 'liver',            // Liver structure
  '64033007': 'kidneys',          // Kidney structure
  '69536005': 'head',             // Head structure
  '12738006': 'brain',            // Brain structure
  '69695003': 'stomach',          // Stomach structure
  '181277001': 'knee-left',       // Left knee (example — actual SNOMED varies)
  '181278006': 'knee-right',      // Right knee (example)
  '122494005': 'spine-cervical',  // Cervical spine
  '122495006': 'spine-thoracic',  // Thoracic spine
  '122496007': 'spine-lumbar',    // Lumbar spine
};

// Display-text-based fallback for bundles that lack SNOMED codes.
const TEXT_TO_ANATOMY: Array<[RegExp, AnatomyRef]> = [
  [/\bheart\b/i, 'heart'],
  [/\blung/i, 'lungs'],
  [/\bliver\b/i, 'liver'],
  [/\bkidney/i, 'kidneys'],
  [/\bbrain\b/i, 'brain'],
  [/\bpancreas\b/i, 'pancreas'],
  [/\bleft knee\b/i, 'knee-left'],
  [/\bright knee\b/i, 'knee-right'],
  [/\bleft shoulder\b/i, 'shoulder-left'],
  [/\bright shoulder\b/i, 'shoulder-right'],
  [/\bcervical spine\b/i, 'spine-cervical'],
  [/\bthoracic spine\b/i, 'spine-thoracic'],
  [/\blumbar spine\b/i, 'spine-lumbar'],
  [/\bskin\b/i, 'skin'],
];

export function resolveAnatomyRef(
  bodySite: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string } | undefined,
): AnatomyRef | undefined {
  if (!bodySite) return undefined;

  for (const coding of bodySite.coding ?? []) {
    if (coding.code && SNOMED_TO_ANATOMY[coding.code]) {
      return SNOMED_TO_ANATOMY[coding.code];
    }
  }

  const text = bodySite.text ?? bodySite.coding?.[0]?.display;
  if (text) {
    for (const [pattern, ref] of TEXT_TO_ANATOMY) {
      if (pattern.test(text)) return ref;
    }
  }

  return undefined;
}
