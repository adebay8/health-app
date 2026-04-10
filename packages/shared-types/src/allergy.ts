import { ProvenanceFields } from './provenance';

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface AllergyRecord extends ProvenanceFields {
  id: string;
  patientId: string;
  substance: string;
  reaction?: string;
  severity?: AllergySeverity;   // FHIR reaction.severity is optional; absent means unknown
  recordedDate: string;
}
