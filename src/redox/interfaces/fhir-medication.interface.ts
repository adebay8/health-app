export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  text?: string;
  coding?: FhirCoding[];
}

export interface FhirDosageInstruction {
  text?: string;
  doseAndRate?: Array<{
    doseQuantity?: {
      value?: number;
      unit?: string;
    };
  }>;
  route?: FhirCodeableConcept;
  timing?: {
    code?: FhirCodeableConcept;
  };
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  status?: string;
  intent?: string;
  subject?: {
    reference?: string;
    display?: string;
  };
  medicationCodeableConcept?: FhirCodeableConcept;
  dosageInstruction?: FhirDosageInstruction[];
  authoredOn?: string;
}

export interface FhirMedicationBundleEntry {
  fullUrl?: string;
  resource: FhirMedicationRequest;
  search?: {
    mode?: 'match' | 'include' | 'outcome';
    score?: number;
  };
}

export interface FhirMedicationBundle {
  resourceType: 'Bundle';
  type: 'searchset';
  total?: number;
  link?: Array<{
    relation: string;
    url: string;
  }>;
  entry?: FhirMedicationBundleEntry[];
}

export interface MedicationResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  status?: string;
  dosage?: {
    value?: number;
    unit?: string;
    route?: string;
    frequency?: string;
  };
  authoredOn?: string;
}
