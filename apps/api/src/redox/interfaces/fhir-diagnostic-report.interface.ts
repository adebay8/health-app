import {
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id?: string;
  status?: string;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  issued?: string;
  result?: FhirReference[];
  conclusion?: string;
}

export type FhirDiagnosticReportBundle = FhirBundleBase<FhirDiagnosticReport>;

export interface DiagnosticReportResult {
  id: string;
  name: string;
  code?: string;
  system?: string;
  status?: string;
  category?: string;
  effectiveDate?: string;
  issued?: string;
  conclusion?: string;
  resultReferences?: string[];
}
