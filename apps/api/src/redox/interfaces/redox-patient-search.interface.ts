export interface RedoxPatientSearchParams {
  given: string;
  family: string;
  birthdate: string;
  gender?: string;
  identifier?: string;
  address?: string;
  telecom?: string;
}

export interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  identifiers?: Array<{
    system: string;
    value: string;
  }>;
  phone?: string;
  email?: string;
  address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
  };
}
