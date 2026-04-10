export interface NormalizedHealthScore {
  sourceEventId?: string;
  type: string;
  state: string;
  value: number;
  factors: Record<string, any>[];
  recordedAt: string;
}

export interface NormalizedBiomarker {
  sourceEventId?: string;
  category: string;
  type: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
}
