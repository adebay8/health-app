import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CachedToken } from './interfaces/particle-token.interface';

const PARTICLE_BASE_URLS: Record<string, string> = {
  sandbox: 'https://sandbox.particlehealth.com',
  production: 'https://api.particlehealth.com',
};

const TOKEN_EXPIRY_BUFFER_MS = 60_000;
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 60 minutes

@Injectable()
export class ParticleAuthService {
  private readonly logger = new Logger(ParticleAuthService.name);
  private cachedToken: CachedToken | null = null;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const env = this.configService.get<string>('PARTICLE_ENV', 'sandbox');
    this.baseUrl = PARTICLE_BASE_URLS[env] || PARTICLE_BASE_URLS.sandbox;
    this.clientId = this.configService.get<string>('PARTICLE_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'PARTICLE_CLIENT_SECRET',
      '',
    );
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getAccessToken(): Promise<string> {
    if (
      this.cachedToken &&
      Date.now() < this.cachedToken.expiresAt - TOKEN_EXPIRY_BUFFER_MS
    ) {
      return this.cachedToken.accessToken;
    }

    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    this.logger.log(
      `Requesting new Particle access token from ${this.baseUrl}/auth`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(`${this.baseUrl}/auth`, {
          headers: {
            'client-id': this.clientId,
            'client-secret': this.clientSecret,
          },
          responseType: 'text',
          transformResponse: [(data) => data],
        }),
      );

      const token = response.data;

      this.cachedToken = {
        accessToken: token,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS,
      };

      this.logger.log('Particle access token acquired successfully');
      return this.cachedToken.accessToken;
    } catch (error) {
      const detail = error.response?.data || error.message;
      this.logger.error(
        `Failed to get Particle token: ${JSON.stringify(detail)}`,
      );
      throw error;
    }
  }
}
