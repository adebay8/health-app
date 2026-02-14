import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirQuantity,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  status?: string;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: Array<{
    low?: FhirQuantity;
    high?: FhirQuantity;
    text?: string;
  }>;
  component?: Array<{
    code?: FhirCodeableConcept;
    valueQuantity?: FhirQuantity;
    valueString?: string;
  }>;
}

export type FhirObservationBundle = FhirBundleBase<FhirObservation>;

export interface ObservationResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  status?: string;
  category?: string;
  value?: string | number;
  unit?: string;
  interpretation?: string;
  referenceRange?: string;
  effectiveDate?: string;
  components?: Array<{
    name: string;
    value?: string | number;
    unit?: string;
  }>;
}
