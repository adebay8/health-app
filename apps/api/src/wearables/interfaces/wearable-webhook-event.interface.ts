import {
  NormalizedHealthScore,
  NormalizedBiomarker,
} from './wearable-data.interface';

export type WebhookEventType =
  | 'score_created'
  | 'biomarker_created'
  | 'archetype_created'
  | 'data_log_received'
  | 'unknown';

export interface NormalizedWebhookEvent {
  eventType: WebhookEventType;
  externalId: string;
  scores: NormalizedHealthScore[];
  biomarkers: NormalizedBiomarker[];
  rawPayload: Record<string, any>;
}
