// Minimal FHIR R4 type shims. We only declare the fields we read.
// Full FHIR types (e.g. @types/fhir) are huge and noisy; a narrow shim is clearer.

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  name?: Array<{ given?: string[]; family?: string }>;
  birthDate?: string;
  gender?: string;
  telecom?: Array<{ system?: string; value?: string }>;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  clinicalStatus?: FhirCodeableConcept;
  onsetDateTime?: string;
  recordedDate?: string;
  bodySite?: FhirCodeableConcept[];
}

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement' | 'MedicationRequest';
  id?: string;
  status?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  effectivePeriod?: FhirPeriod;
  effectiveDateTime?: string;
  dosage?: Array<{
    text?: string;
    timing?: { code?: FhirCodeableConcept; repeat?: { frequency?: number; period?: number; periodUnit?: string } };
  }>;
}

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id?: string;
  code?: FhirCodeableConcept;
  reaction?: Array<{
    manifestation?: FhirCodeableConcept[];
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
  recordedDate?: string;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  status?: string;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  component?: Array<{ code?: FhirCodeableConcept; valueQuantity?: FhirQuantity }>;
  referenceRange?: Array<FhirRange>;
  interpretation?: FhirCodeableConcept[];
  bodySite?: FhirCodeableConcept;
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id?: string;
  class?: FhirCoding;
  type?: FhirCodeableConcept[];
  reasonCode?: FhirCodeableConcept[];
  subject?: FhirReference;
  period?: FhirPeriod;
  participant?: Array<{ individual?: FhirReference }>;
}

export type FhirResource =
  | FhirPatient
  | FhirCondition
  | FhirMedicationStatement
  | FhirAllergyIntolerance
  | FhirObservation
  | FhirEncounter
  | { resourceType: string; id?: string; [k: string]: unknown };

export interface FhirBundleEntry {
  resource?: FhirResource;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type?: string;
  entry?: FhirBundleEntry[];
}
