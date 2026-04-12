import Link from 'next/link';
import { PatientSwitcher } from './patient-switcher';
import { listPatients } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';

export async function Header() {
  const patients = await listPatients();
  const currentPatientId = await getCurrentPatientId();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Health
        </Link>
        <PatientSwitcher
          patients={patients}
          currentPatientId={currentPatientId}
        />
      </div>
    </header>
  );
}
