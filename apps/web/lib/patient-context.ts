import { cookies } from 'next/headers';
import { listPatients } from './api-client';

export const PATIENT_COOKIE_NAME = 'demo-patient-id';

export async function getCurrentPatientId(): Promise<string> {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get(PATIENT_COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  const patients = await listPatients();
  if (patients.length === 0) {
    throw new Error('No demo patients available — run `pnpm seed` in apps/api.');
  }
  return patients[0].id;
}
