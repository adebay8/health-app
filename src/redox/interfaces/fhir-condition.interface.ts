import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  severity?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  onsetDateTime?: string;
  onsetPeriod?: FhirPeriod;
  abatementDateTime?: string;
  recordedDate?: string;
}

export type FhirConditionBundle = FhirBundleBase<FhirCondition>;

export interface ConditionResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  clinicalStatus?: string;
  verificationStatus?: string;
  category?: string;
  severity?: string;
  onsetDate?: string;
  abatementDate?: string;
  recordedDate?: string;
}
