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

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
}
