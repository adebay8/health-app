import { ProvenanceFields } from './provenance';

export type EncounterType = 'ambulatory' | 'emergency' | 'inpatient' | 'virtual';

export interface EncounterRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  type: EncounterType;
  reason?: string;
  providerName?: string;
  startDate: string;
  endDate?: string;
}
