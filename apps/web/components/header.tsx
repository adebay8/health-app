import Link from 'next/link';
import { Activity } from 'lucide-react';
import { PatientSwitcher } from './patient-switcher';
import { listPatients } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';

export async function Header() {
  const patients = await listPatients();
  const currentPatientId = await getCurrentPatientId();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-primary"
        >
          <Activity className="h-5 w-5" />
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
