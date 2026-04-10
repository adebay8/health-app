import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RedoxService } from './redox.service';
import { RedoxController } from './redox.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [RedoxController],
  providers: [RedoxService],
  exports: [RedoxService],
})
export class RedoxModule {}
