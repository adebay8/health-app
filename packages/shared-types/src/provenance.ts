export type ProviderSource = 'particle' | 'redox' | 'manual' | 'wearable';

export interface ProvenanceFields {
  providerSource: ProviderSource;
  providerRecordId: string;
  fetchedAt: string;           // ISO 8601 timestamp
  rawSnapshot?: unknown;
}
