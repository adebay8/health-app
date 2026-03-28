import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ParticleController } from './particle.controller';
import { ParticleService } from './particle.service';
import { ParticleAuthService } from './particle-auth.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [ParticleController],
  providers: [ParticleService, ParticleAuthService],
  exports: [ParticleService],
})
export class ParticleModule {}
