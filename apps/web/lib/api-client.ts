import type {
  AskRequest,
  AskResponse,
  InsightsResponse,
  NormalizedPatientPayload,
  PatientSummary,
} from '@health-app/shared-types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

// Every backend response is wrapped by the TransformInterceptor as
// { success: true, data: <payload> }. This helper unwraps it once.
interface Envelope<T> {
  success: boolean;
  data: T;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiClientError(res.status, `${res.status} ${res.statusText}: ${body}`);
  }

  const env: Envelope<T> = await res.json();
  return env.data;
}

export class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function listPatients(): Promise<PatientSummary[]> {
  return request<PatientSummary[]>('/dashboard/patients');
}

export async function getPatient(
  patientId: string,
): Promise<NormalizedPatientPayload> {
  return request<NormalizedPatientPayload>(`/dashboard/patients/${patientId}`);
}

export async function getInsights(
  patientId: string,
): Promise<InsightsResponse> {
  return request<InsightsResponse>(
    `/dashboard/patients/${patientId}/insights`,
  );
}

export async function askQuestion(
  patientId: string,
  question: string,
): Promise<AskResponse> {
  const body: AskRequest = { question };
  return request<AskResponse>(`/dashboard/patients/${patientId}/ask`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function refreshPatient(
  patientId: string,
): Promise<NormalizedPatientPayload> {
  return request<NormalizedPatientPayload>(
    `/dashboard/patients/${patientId}/refresh`,
    { method: 'POST' },
  );
}
