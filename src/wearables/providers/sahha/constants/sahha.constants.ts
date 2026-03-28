export const SAHHA_BASE_URLS: Record<string, string> = {
  sandbox: 'https://sandbox-api.sahha.ai',
  production: 'https://api.sahha.ai',
};

export const SAHHA_TOKEN_PATH = '/api/v1/oauth/account/token';
export const SAHHA_PROFILE_REGISTER_PATH = '/api/v1/oauth/profile/register';
export const SAHHA_PROFILE_TOKEN_PATH = '/api/v1/oauth/profile/token';
export const SAHHA_SCORES_PATH = '/api/v1/profile/score';
export const SAHHA_BIOMARKERS_PATH = '/api/v1/profile/biomarker';

export const SAHHA_TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export const SAHHA_EVENT_TYPE_MAP: Record<string, string> = {
  ScoreCreatedIntegrationEvent: 'score_created',
  BiomarkerCreatedIntegrationEvent: 'biomarker_created',
  ArchetypeCreatedIntegrationEvent: 'archetype_created',
  DataLogReceivedIntegrationEvent: 'data_log_received',
};
