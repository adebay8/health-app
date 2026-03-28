import {
  NormalizedHealthScore,
  NormalizedBiomarker,
} from './wearable-data.interface';
import { NormalizedWebhookEvent } from './wearable-webhook-event.interface';

export interface RegisterProfileResult {
  externalId: string;
  profileToken: string;
}

export interface WearableProvider {
  readonly providerName: string;

  registerProfile(externalId: string): Promise<RegisterProfileResult>;

  getHealthScores(
    profileToken: string,
    types?: string[],
  ): Promise<NormalizedHealthScore[]>;

  getBiomarkers(
    profileToken: string,
    categories?: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<NormalizedBiomarker[]>;

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;

  parseWebhookEvent(payload: any): NormalizedWebhookEvent;
}
