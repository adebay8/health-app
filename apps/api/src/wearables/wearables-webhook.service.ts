import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WearableProvider } from './interfaces/wearable-provider.interface';
import { WEARABLE_PROVIDERS } from './constants/wearables.constants';
import { WearableProfile } from './entities/wearable-profile.entity';
import { HealthScore } from './entities/health-score.entity';
import { Biomarker } from './entities/biomarker.entity';
import {
  WebhookEventLog,
  ProcessingStatus,
} from './entities/webhook-event-log.entity';

@Injectable()
export class WearablesWebhookService {
  private readonly logger = new Logger(WearablesWebhookService.name);

  constructor(
    @Inject(WEARABLE_PROVIDERS)
    private readonly providers: Map<string, WearableProvider>,
    @InjectRepository(WearableProfile)
    private readonly profileRepo: Repository<WearableProfile>,
    @InjectRepository(HealthScore)
    private readonly scoreRepo: Repository<HealthScore>,
    @InjectRepository(Biomarker)
    private readonly biomarkerRepo: Repository<Biomarker>,
    @InjectRepository(WebhookEventLog)
    private readonly eventLogRepo: Repository<WebhookEventLog>,
  ) {}

  async handleWebhook(
    providerName: string,
    rawBody: Buffer,
    signature: string,
    payload: any,
  ) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(`Unknown provider: ${providerName}`);
    }

    // Verify signature
    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    // Log the raw event
    const eventLog = this.eventLogRepo.create({
      providerName,
      eventType: payload.eventType || 'unknown',
      externalId: payload.externalId || null,
      payload: JSON.stringify(payload),
      processingStatus: ProcessingStatus.RECEIVED,
    });
    await this.eventLogRepo.save(eventLog);

    try {
      // Parse and normalize
      const event = provider.parseWebhookEvent(payload);

      // Look up the patient by externalId
      const profile = await this.profileRepo.findOne({
        where: { externalId: event.externalId, providerName },
      });

      if (!profile) {
        this.logger.warn(
          `No profile found for externalId: ${event.externalId} (${providerName})`,
        );
        eventLog.processingStatus = ProcessingStatus.FAILED;
        eventLog.errorMessage = `No profile for externalId: ${event.externalId}`;
        await this.eventLogRepo.save(eventLog);
        return { status: 'ignored', reason: 'no matching profile' };
      }

      // Persist scores with deduplication
      for (const score of event.scores) {
        if (score.sourceEventId) {
          const exists = await this.scoreRepo.findOne({
            where: { sourceEventId: score.sourceEventId },
          });
          if (exists) continue;
        }

        const entity = this.scoreRepo.create({
          patientId: profile.patientId,
          providerName,
          type: score.type,
          value: score.value,
          state: score.state,
          factors: JSON.stringify(score.factors),
          sourceEventId: score.sourceEventId,
          recordedAt: score.recordedAt,
        });
        await this.scoreRepo.save(entity);
      }

      // Persist biomarkers with deduplication
      for (const biomarker of event.biomarkers) {
        if (biomarker.sourceEventId) {
          const exists = await this.biomarkerRepo.findOne({
            where: { sourceEventId: biomarker.sourceEventId },
          });
          if (exists) continue;
        }

        const entity = this.biomarkerRepo.create({
          patientId: profile.patientId,
          providerName,
          category: biomarker.category,
          type: biomarker.type,
          value: biomarker.value,
          unit: biomarker.unit,
          sourceEventId: biomarker.sourceEventId,
          startDate: biomarker.startDate,
          endDate: biomarker.endDate,
        });
        await this.biomarkerRepo.save(entity);
      }

      eventLog.processingStatus = ProcessingStatus.PROCESSED;
      await this.eventLogRepo.save(eventLog);

      this.logger.log(
        `Processed webhook: ${event.eventType} for ${event.externalId} (${event.scores.length} scores, ${event.biomarkers.length} biomarkers)`,
      );

      return { status: 'processed' };
    } catch (error) {
      eventLog.processingStatus = ProcessingStatus.FAILED;
      eventLog.errorMessage = error.message;
      await this.eventLogRepo.save(eventLog);
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }
}
