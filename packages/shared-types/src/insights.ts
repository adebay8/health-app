import { AnatomyRef } from './anatomy';

export type InsightSeverity = 'info' | 'watch' | 'concern';
export type InsightCategory = 'lab' | 'vital' | 'medication' | 'gap';

export interface InsightFlag {
  id: string;                  // stable hash — UI key
  severity: InsightSeverity;
  category: InsightCategory;
  metric?: string;
  observedValue?: string;
  message: string;             // short, structured — NOT narrative
  anatomyRef?: AnatomyRef;
}

export interface InsightsResponse {
  flags: InsightFlag[];
  narration: string;
}

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
}
