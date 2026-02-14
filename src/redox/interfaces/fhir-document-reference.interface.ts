import {
  FhirCodeableConcept,
  FhirReference,
  FhirBundleBase,
} from './fhir-common.interface';

export interface FhirDocumentReference {
  resourceType: 'DocumentReference';
  id?: string;
  status?: string;
  type?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  subject?: FhirReference;
  date?: string;
  author?: FhirReference[];
  description?: string;
  content?: Array<{
    attachment?: {
      contentType?: string;
      url?: string;
      title?: string;
    };
  }>;
}

export type FhirDocumentReferenceBundle = FhirBundleBase<FhirDocumentReference>;

export interface DocumentReferenceResult {
  id: string;
  type?: string;
  category?: string;
  status?: string;
  date?: string;
  author?: string;
  description?: string;
  content?: Array<{
    contentType?: string;
    url?: string;
    title?: string;
  }>;
}
