import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirCarePlan {
  resourceType: 'CarePlan';
  id?: string;
  status?: string;
  intent?: string;
  title?: string;
  description?: string;
  subject?: FhirReference;
  period?: FhirPeriod;
  category?: FhirCodeableConcept[];
  activity?: Array<{
    detail?: {
      code?: FhirCodeableConcept;
      status?: string;
      description?: string;
    };
  }>;
}

export type FhirCarePlanBundle = FhirBundleBase<FhirCarePlan>;

export interface CarePlanResult {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  intent?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  activities?: Array<{
    name?: string;
    status?: string;
    description?: string;
  }>;
}
