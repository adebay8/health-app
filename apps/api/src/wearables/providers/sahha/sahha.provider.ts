import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import {
  WearableProvider,
  RegisterProfileResult,
} from '../../interfaces/wearable-provider.interface';
import {
  NormalizedHealthScore,
  NormalizedBiomarker,
} from '../../interfaces/wearable-data.interface';
import {
  NormalizedWebhookEvent,
  WebhookEventType,
} from '../../interfaces/wearable-webhook-event.interface';
import { SahhaAuthService } from './sahha-auth.service';
import {
  SAHHA_PROFILE_REGISTER_PATH,
  SAHHA_SCORES_PATH,
  SAHHA_BIOMARKERS_PATH,
  SAHHA_EVENT_TYPE_MAP,
} from './constants/sahha.constants';
import {
  SahhaProfileRegisterResponse,
  SahhaScore,
  SahhaBiomarker,
  SahhaWebhookPayload,
} from './interfaces/sahha-api.interface';

@Injectable()
export class SahhaProvider implements WearableProvider {
  private readonly logger = new Logger(SahhaProvider.name);
  readonly providerName = 'sahha';
  private readonly webhookSecret: string;

  constructor(
    private readonly authService: SahhaAuthService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'SAHHA_WEBHOOK_SECRET',
      '',
    );
  }

  async registerProfile(externalId: string): Promise<RegisterProfileResult> {
    const accountToken = await this.authService.getAccountToken();
    const baseUrl = this.authService.getBaseUrl();

    const response = await firstValueFrom(
      this.httpService.post<SahhaProfileRegisterResponse>(
        `${baseUrl}${SAHHA_PROFILE_REGISTER_PATH}`,
        { externalId },
        {
          headers: { Authorization: `Bearer ${accountToken}` },
        },
      ),
    );

    this.logger.log(
      `Registered Sahha profile for externalId: ${externalId}`,
    );

    return {
      externalId,
      profileToken: response.data.profileToken,
    };
  }

  async getHealthScores(
    profileToken: string,
    types?: string[],
  ): Promise<NormalizedHealthScore[]> {
    const baseUrl = this.authService.getBaseUrl();

    const params: Record<string, string> = {};
    if (types?.length) {
      params.types = types.join(',');
    }

    const response = await firstValueFrom(
      this.httpService.get<SahhaScore[]>(
        `${baseUrl}${SAHHA_SCORES_PATH}`,
        {
          headers: { Authorization: `Profile ${profileToken}` },
          params,
        },
      ),
    );

    return response.data.map((score) => this.normalizeScore(score));
  }

  async getBiomarkers(
    profileToken: string,
    categories?: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<NormalizedBiomarker[]> {
    const baseUrl = this.authService.getBaseUrl();

    const params: Record<string, string> = {};
    if (categories?.length) {
      params.categories = categories.join(',');
    }
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await firstValueFrom(
      this.httpService.get<SahhaBiomarker[]>(
        `${baseUrl}${SAHHA_BIOMARKERS_PATH}`,
        {
          headers: { Authorization: `Profile ${profileToken}` },
          params,
        },
      ),
    );

    return response.data.map((biomarker) =>
      this.normalizeBiomarker(biomarker),
    );
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    const hmac = createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');

    return expectedSignature === signature;
  }

  parseWebhookEvent(payload: SahhaWebhookPayload): NormalizedWebhookEvent {
    const mappedType = SAHHA_EVENT_TYPE_MAP[payload.eventType];
    const eventType: WebhookEventType =
      (mappedType as WebhookEventType) || 'unknown';

    const scores = (payload.scores || []).map((s) => this.normalizeScore(s));
    const biomarkers = (payload.biomarkers || []).map((b) =>
      this.normalizeBiomarker(b),
    );

    return {
      eventType,
      externalId: payload.externalId,
      scores,
      biomarkers,
      rawPayload: payload,
    };
  }

  private normalizeScore(score: SahhaScore): NormalizedHealthScore {
    return {
      sourceEventId: score.id,
      type: score.type,
      state: score.state,
      value: score.value,
      factors: score.factors || [],
      recordedAt: score.createdAtUtc,
    };
  }

  private normalizeBiomarker(biomarker: SahhaBiomarker): NormalizedBiomarker {
    return {
      sourceEventId: biomarker.id,
      category: biomarker.category,
      type: biomarker.type,
      value: biomarker.value,
      unit: biomarker.unit,
      startDate: biomarker.startDateTime,
      endDate: biomarker.endDateTime,
    };
  }
}
