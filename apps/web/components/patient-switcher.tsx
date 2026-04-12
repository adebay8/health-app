'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { PatientSummary } from '@health-app/shared-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const PATIENT_COOKIE_NAME = 'demo-patient-id';

interface Props {
  patients: PatientSummary[];
  currentPatientId: string;
}

export function PatientSwitcher({ patients, currentPatientId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current =
    patients.find((p) => p.id === currentPatientId) ?? patients[0];

  function selectPatient(id: string) {
    document.cookie = `${PATIENT_COOKIE_NAME}=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => {
      router.refresh();
    });
  }

  if (!current) {
    return (
      <span className="text-sm text-muted-foreground">No demo patients</span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          {current.firstName} {current.lastName}
          <span aria-hidden="true" className="ml-2">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {patients.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => selectPatient(p.id)}>
            {p.firstName} {p.lastName}
            <span className="ml-2 text-xs text-muted-foreground">
              {p.gender} · {p.dateOfBirth}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
