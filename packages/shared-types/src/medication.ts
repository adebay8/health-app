import { ProvenanceFields } from './provenance';

export type MedicationStatus = 'active' | 'completed' | 'stopped';

export interface MedicationRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  code: string;                // RxNorm
  codeSystem: string;
  display: string;
  dosage?: string;
  frequency?: string;
  status: MedicationStatus;
  startDate?: string;
  endDate?: string;
}
