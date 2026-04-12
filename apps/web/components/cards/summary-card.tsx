import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import type { NormalizedPatientPayload } from '@health-app/shared-types';

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function SummaryCard({ payload }: { payload: NormalizedPatientPayload }) {
  const { patient, conditions, medications } = payload;
  const age = ageFromDob(patient.dateOfBirth);
  const activeConditions = conditions.filter((c) => c.clinicalStatus === 'active').length;
  const activeMeds = medications.filter((m) => m.status === 'active').length;

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-primary to-[oklch(0.45_0.12_220)] text-primary-foreground shadow-lg">
      <CardHeader className="pb-3">
        <div className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
          Patient Overview
        </div>
        <CardTitle className="text-3xl font-bold text-primary-foreground">
          {patient.firstName} {patient.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
            {age} yo
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
            {patient.gender}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
            {activeConditions} condition{activeConditions === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
            {activeMeds} medication{activeMeds === 1 ? '' : 's'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
