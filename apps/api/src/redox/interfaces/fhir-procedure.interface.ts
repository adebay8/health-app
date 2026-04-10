import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirProcedure {
  resourceType: 'Procedure';
  id?: string;
  status?: string;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  performedDateTime?: string;
  performedPeriod?: FhirPeriod;
  performer?: Array<{
    actor?: FhirReference;
  }>;
  location?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
}

export type FhirProcedureBundle = FhirBundleBase<FhirProcedure>;

export interface ProcedureResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  status?: string;
  performedDate?: string;
  performer?: string;
  reason?: string;
}
