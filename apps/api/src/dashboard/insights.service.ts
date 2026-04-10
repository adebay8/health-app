import { Inject, Injectable } from '@nestjs/common';
import { generateFlags } from '@health-app/insights-rules';
import type { InsightFlag, InsightsResponse } from '@health-app/shared-types';
import { DashboardService } from './dashboard.service';
import { LLM_SERVICE, LlmService } from '../llm/llm.service';

@Injectable()
export class InsightsService {
  constructor(
    private readonly dashboard: DashboardService,
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
  ) {}

  async getInsights(patientId: string): Promise<InsightsResponse> {
    const payload = await this.dashboard.getPatientPayload(patientId);
    const flags: InsightFlag[] = generateFlags(payload);
    const narration = await this.llm.narrateInsights(payload, flags);
    return { flags, narration };
  }

  async ask(patientId: string, question: string): Promise<{ answer: string }> {
    const payload = await this.dashboard.getPatientPayload(patientId);
    const answer = await this.llm.answerQuestion(payload, question);
    return { answer };
  }
}
