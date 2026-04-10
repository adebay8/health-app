import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { WearablesWebhookService } from './wearables-webhook.service';

@ApiTags('Wearable Webhooks')
@Controller('wearables/webhooks')
export class WearablesWebhookController {
  constructor(private readonly webhookService: WearablesWebhookService) {}

  @Post(':providerName')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive webhook event',
    description:
      'Endpoint for wearable providers to push real-time data events',
  })
  async handleWebhook(
    @Param('providerName') providerName: string,
    @Headers('x-signature') signature: string,
    @Req() req: Request,
  ) {
    const rawBody = (req as any).rawBody as Buffer;
    const payload = req.body;

    return this.webhookService.handleWebhook(
      providerName,
      rawBody,
      signature || '',
      payload,
    );
  }
}
