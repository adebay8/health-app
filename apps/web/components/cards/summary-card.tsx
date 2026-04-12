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
    <Card className="bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      <CardHeader className="pb-2">
        <div className="text-xs uppercase tracking-wide text-white/70">Summary</div>
        <CardTitle className="text-2xl text-white">
          {patient.firstName} {patient.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-white/90">
        {age} yo · {patient.gender} · {activeConditions} active condition
        {activeConditions === 1 ? '' : 's'} · {activeMeds} active medication
        {activeMeds === 1 ? '' : 's'}
      </CardContent>
    </Card>
  );
}
