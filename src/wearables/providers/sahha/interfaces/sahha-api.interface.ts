export interface SahhaTokenResponse {
  accountToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface SahhaProfileRegisterResponse {
  profileToken: string;
  refreshToken: string;
}

export interface SahhaProfileTokenResponse {
  profileToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface SahhaScore {
  id: string;
  type: string;
  state: string;
  value: number;
  factors: SahhaScoreFactor[];
  createdAtUtc: string;
}

export interface SahhaScoreFactor {
  name: string;
  value: number;
  goal: number;
  state: string;
}

export interface SahhaBiomarker {
  id: string;
  category: string;
  type: string;
  value: number;
  unit: string;
  startDateTime: string;
  endDateTime: string;
}

export interface SahhaWebhookPayload {
  eventType: string;
  externalId: string;
  scores?: SahhaScore[];
  biomarkers?: SahhaBiomarker[];
  [key: string]: any;
}
