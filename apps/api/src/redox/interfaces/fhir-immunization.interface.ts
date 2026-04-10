import {
  FhirCodeableConcept,
  FhirReference,
  FhirQuantity,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirImmunization {
  resourceType: 'Immunization';
  id?: string;
  status?: string;
  vaccineCode?: FhirCodeableConcept;
  patient?: FhirReference;
  occurrenceDateTime?: string;
  primarySource?: boolean;
  lotNumber?: string;
  site?: FhirCodeableConcept;
  route?: FhirCodeableConcept;
  doseQuantity?: FhirQuantity;
}

export type FhirImmunizationBundle = FhirBundleBase<FhirImmunization>;

export interface ImmunizationResult {
  id: string;
  vaccineName: string;
  code?: string;
  system?: string;
  status?: string;
  occurrenceDate?: string;
  lotNumber?: string;
  site?: string;
  route?: string;
}
