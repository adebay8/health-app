import {
  FhirCodeableConcept,
  FhirReference,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id?: string;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: string;
  category?: string[];
  criticality?: string;
  code?: FhirCodeableConcept;
  patient?: FhirReference;
  onsetDateTime?: string;
  recordedDate?: string;
  reaction?: Array<{
    substance?: FhirCodeableConcept;
    manifestation?: FhirCodeableConcept[];
    severity?: string;
  }>;
}

export type FhirAllergyBundle = FhirBundleBase<FhirAllergyIntolerance>;

export interface AllergyResult {
  id: string;
  substance: string;
  code?: string;
  system?: string;
  clinicalStatus?: string;
  type?: string;
  category?: string;
  criticality?: string;
  onsetDate?: string;
  recordedDate?: string;
  reactions?: Array<{
    manifestation: string;
    severity?: string;
  }>;
}
