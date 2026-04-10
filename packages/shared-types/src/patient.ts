export type Gender = 'male' | 'female' | 'other' | 'unknown';

export interface ExternalIds {
  particle?: string;
  redox?: string;
}

export interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;         // ISO date (YYYY-MM-DD)
  gender: Gender;
  email?: string;
  phoneNumber?: string;
  externalIds: ExternalIds;
}

export type PatientSummary = Pick<
  PatientRecord,
  'id' | 'firstName' | 'lastName' | 'dateOfBirth' | 'gender'
>;
