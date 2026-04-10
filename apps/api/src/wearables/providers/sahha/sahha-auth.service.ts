import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SAHHA_BASE_URLS,
  SAHHA_TOKEN_PATH,
  SAHHA_TOKEN_EXPIRY_BUFFER_MS,
} from './constants/sahha.constants';
import { SahhaTokenResponse } from './interfaces/sahha-api.interface';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class SahhaAuthService {
  private readonly logger = new Logger(SahhaAuthService.name);
  private cachedToken: CachedToken | null = null;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const env = this.configService.get<string>('SAHHA_ENV', 'sandbox');
    this.baseUrl = SAHHA_BASE_URLS[env] || SAHHA_BASE_URLS.sandbox;
    this.clientId = this.configService.get<string>('SAHHA_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'SAHHA_CLIENT_SECRET',
      '',
    );
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getAccountToken(): Promise<string> {
    if (
      this.cachedToken &&
      Date.now() < this.cachedToken.expiresAt - SAHHA_TOKEN_EXPIRY_BUFFER_MS
    ) {
      return this.cachedToken.token;
    }

    this.logger.log('Requesting new Sahha account token');

    const response = await firstValueFrom(
      this.httpService.post<SahhaTokenResponse>(
        `${this.baseUrl}${SAHHA_TOKEN_PATH}`,
        {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
        },
      ),
    );

    this.cachedToken = {
      token: response.data.accountToken,
      expiresAt: Date.now() + response.data.expiresIn * 1000,
    };

    this.logger.log('Sahha account token acquired successfully');
    return this.cachedToken.token;
  }
}
