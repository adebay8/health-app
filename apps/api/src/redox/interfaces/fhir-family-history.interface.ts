import {
  FhirCodeableConcept,
  FhirReference,
  FhirQuantity,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirFamilyMemberHistory {
  resourceType: 'FamilyMemberHistory';
  id?: string;
  status?: string;
  patient?: FhirReference;
  relationship?: FhirCodeableConcept;
  sex?: FhirCodeableConcept;
  condition?: Array<{
    code?: FhirCodeableConcept;
    outcome?: FhirCodeableConcept;
    onsetAge?: FhirQuantity;
  }>;
}

export type FhirFamilyMemberHistoryBundle =
  FhirBundleBase<FhirFamilyMemberHistory>;

export interface FamilyMemberHistoryResult {
  id: string;
  status?: string;
  relationship?: string;
  sex?: string;
  conditions?: Array<{
    name: string;
    outcome?: string;
    onsetAge?: number;
  }>;
}
