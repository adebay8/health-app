import {
  FhirCodeableConcept,
  FhirReference,
  FhirQuantity,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirGoal {
  resourceType: 'Goal';
  id?: string;
  lifecycleStatus?: string;
  achievementStatus?: FhirCodeableConcept;
  description?: FhirCodeableConcept;
  subject?: FhirReference;
  startDate?: string;
  target?: Array<{
    measure?: FhirCodeableConcept;
    detailQuantity?: FhirQuantity;
    dueDate?: string;
  }>;
}

export type FhirGoalBundle = FhirBundleBase<FhirGoal>;

export interface GoalResult {
  id: string;
  description: string;
  lifecycleStatus?: string;
  achievementStatus?: string;
  startDate?: string;
  targets?: Array<{
    measure?: string;
    targetValue?: number;
    unit?: string;
    dueDate?: string;
  }>;
}
