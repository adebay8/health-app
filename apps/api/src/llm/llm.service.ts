import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';

export const LLM_SERVICE = Symbol('LLM_SERVICE');

export interface LlmService {
  narrateInsights(
    patient: NormalizedPatientPayload,
    flags: InsightFlag[],
  ): Promise<string>;

  answerQuestion(
    patient: NormalizedPatientPayload,
    question: string,
  ): Promise<string>;
}
