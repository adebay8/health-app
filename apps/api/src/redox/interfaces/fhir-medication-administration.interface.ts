import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirQuantity,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirMedicationAdministration {
  resourceType: 'MedicationAdministration';
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  dosage?: {
    dose?: FhirQuantity;
    route?: FhirCodeableConcept;
  };
}

export type FhirMedicationAdministrationBundle =
  FhirBundleBase<FhirMedicationAdministration>;

export interface MedicationAdministrationResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  status?: string;
  effectiveDate?: string;
  dosage?: {
    value?: number;
    unit?: string;
    route?: string;
  };
}
