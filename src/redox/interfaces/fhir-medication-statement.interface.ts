import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirQuantity,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement';
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  dateAsserted?: string;
  dosage?: Array<{
    text?: string;
    route?: FhirCodeableConcept;
    doseAndRate?: Array<{
      doseQuantity?: FhirQuantity;
    }>;
  }>;
}

export type FhirMedicationStatementBundle =
  FhirBundleBase<FhirMedicationStatement>;

export interface MedicationStatementResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  status?: string;
  effectiveDate?: string;
  dateAsserted?: string;
  dosage?: string;
}
