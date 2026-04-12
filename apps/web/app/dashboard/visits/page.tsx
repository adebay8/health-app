import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { EncountersCard } from '@/components/cards/encounters-card';

export default async function VisitsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Visits</h2>
      <EncountersCard encounters={payload.encounters} />
    </div>
  );
}
