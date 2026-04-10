import { Injectable } from '@nestjs/common';
import type { InsightFlag, NormalizedPatientPayload } from '@health-app/shared-types';
import type { LlmService } from './llm.service';

@Injectable()
export class StubLlmService implements LlmService {
  async narrateInsights(
    patient: NormalizedPatientPayload,
    flags: InsightFlag[],
  ): Promise<string> {
    const firstName = patient.patient.firstName || 'there';

    if (flags.length === 0) {
      return `Hi ${firstName} — your record looks clean based on the data we have. Keep up your regular check-ins with your provider.`;
    }

    const concern = flags.find((f) => f.severity === 'concern');
    const watch = flags.find((f) => f.severity === 'watch');
    const top = concern ?? watch ?? flags[0];

    const lead = concern
      ? `Hi ${firstName} — there's something worth bringing up with your provider.`
      : `Hi ${firstName} — a few things are worth keeping an eye on.`;

    const body = top.observedValue
      ? `${top.metric ?? 'One metric'} is ${top.observedValue}: ${top.message}`
      : top.message;

    const tail =
      flags.length > 1
        ? ` There ${flags.length - 1 === 1 ? 'is' : 'are'} ${flags.length - 1} other item${flags.length - 1 === 1 ? '' : 's'} flagged too — see the list below.`
        : '';

    return `${lead} ${body}${tail}`;
  }

  async answerQuestion(
    patient: NormalizedPatientPayload,
    question: string,
  ): Promise<string> {
    const firstName = patient.patient.firstName || 'there';
    const conditionCount = patient.conditions.length;
    const medCount = patient.medications.filter((m) => m.status === 'active').length;
    return (
      `Thanks for the question, ${firstName}. (This is a stubbed response — ` +
      `your record currently has ${conditionCount} condition(s) and ${medCount} active medication(s).) ` +
      `I can't give medical advice; please discuss "${question}" with your provider.`
    );
  }
}
