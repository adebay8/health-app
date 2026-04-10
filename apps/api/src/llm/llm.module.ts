import { Module } from '@nestjs/common';
import { LLM_SERVICE } from './llm.service';
import { StubLlmService } from './stub-llm.service';

@Module({
  providers: [
    {
      provide: LLM_SERVICE,
      useClass: StubLlmService,
    },
  ],
  exports: [LLM_SERVICE],
})
export class LlmModule {}
