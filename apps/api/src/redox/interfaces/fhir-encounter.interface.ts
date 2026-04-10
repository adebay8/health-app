import {
  FhirCodeableConcept,
  FhirCoding,
  FhirReference,
  FhirPeriod,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirEncounter {
  resourceType: 'Encounter';
  id?: string;
  status?: string;
  class?: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: FhirReference;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
  location?: Array<{
    location?: FhirReference;
  }>;
  participant?: Array<{
    individual?: FhirReference;
  }>;
}

export type FhirEncounterBundle = FhirBundleBase<FhirEncounter>;

export interface EncounterResult {
  id: string;
  status?: string;
  class?: string;
  type?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  participant?: string;
}
