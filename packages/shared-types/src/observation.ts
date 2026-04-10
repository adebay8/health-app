import { AnatomyRef } from './anatomy';
import { ProvenanceFields } from './provenance';

export type ObservationCategory = 'lab' | 'vital-sign';
export type ObservationInterpretation = 'normal' | 'low' | 'high' | 'critical';

export interface ObservationRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  category: ObservationCategory;
  code: string;                // LOINC
  codeSystem: string;
  display: string;
  value: string;               // string so we can represent "138/86" as one value when needed
  unit?: string;
  referenceRangeLow?: number;  // only meaningful when unit is set
  referenceRangeHigh?: number; // only meaningful when unit is set
  interpretation?: ObservationInterpretation;
  effectiveDate: string;
  anatomyRef?: AnatomyRef;
}
