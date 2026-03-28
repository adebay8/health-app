import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WEARABLE_PROVIDERS } from './constants/wearables.constants';
import { WearableProvider } from './interfaces/wearable-provider.interface';
import { WearablesController } from './wearables.controller';
import { WearablesService } from './wearables.service';
import { WearablesWebhookController } from './wearables-webhook.controller';
import { WearablesWebhookService } from './wearables-webhook.service';
import { SahhaProvider } from './providers/sahha/sahha.provider';
import { SahhaAuthService } from './providers/sahha/sahha-auth.service';
import { WearableProfile } from './entities/wearable-profile.entity';
import { HealthScore } from './entities/health-score.entity';
import { Biomarker } from './entities/biomarker.entity';
import { WebhookEventLog } from './entities/webhook-event-log.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      WearableProfile,
      HealthScore,
      Biomarker,
      WebhookEventLog,
    ]),
  ],
  controllers: [WearablesController, WearablesWebhookController],
  providers: [
    SahhaAuthService,
    SahhaProvider,
    {
      provide: WEARABLE_PROVIDERS,
      useFactory: (sahha: SahhaProvider): Map<string, WearableProvider> => {
        const providers = new Map<string, WearableProvider>();
        providers.set(sahha.providerName, sahha);
        return providers;
      },
      inject: [SahhaProvider],
    },
    WearablesService,
    WearablesWebhookService,
  ],
  exports: [WearablesService],
})
export class WearablesModule {}
