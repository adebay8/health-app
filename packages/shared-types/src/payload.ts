import { AllergyRecord } from './allergy';
import { ConditionRecord } from './condition';
import { EncounterRecord } from './encounter';
import { MedicationRecord } from './medication';
import { ObservationRecord } from './observation';
import { PatientRecord } from './patient';

export interface NormalizedPatientPayload {
  patient: PatientRecord;
  conditions: ConditionRecord[];
  medications: MedicationRecord[];
  allergies: AllergyRecord[];
  observations: ObservationRecord[];
  encounters: EncounterRecord[];
  warnings: string[];
}
