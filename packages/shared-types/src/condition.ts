import { AnatomyRef } from './anatomy';
import { ProvenanceFields } from './provenance';

export type ConditionClinicalStatus = 'active' | 'resolved' | 'inactive';

export interface ConditionRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  code: string;                // SNOMED / ICD-10
  codeSystem: string;          // e.g. "http://snomed.info/sct"
  display: string;
  clinicalStatus: ConditionClinicalStatus;
  onsetDate?: string;
  recordedDate: string;
  anatomyRef?: AnatomyRef;
}
