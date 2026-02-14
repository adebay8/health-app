import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirCareTeam {
  resourceType: 'CareTeam';
  id?: string;
  status?: string;
  name?: string;
  subject?: FhirReference;
  period?: FhirPeriod;
  participant?: Array<{
    role?: FhirCodeableConcept[];
    member?: FhirReference;
  }>;
}

export type FhirCareTeamBundle = FhirBundleBase<FhirCareTeam>;

export interface CareTeamResult {
  id: string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  participants?: Array<{
    name?: string;
    role?: string;
  }>;
}
