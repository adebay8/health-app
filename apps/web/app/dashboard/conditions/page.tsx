import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { ConditionsCard } from '@/components/cards/conditions-card';

export default async function ConditionsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Conditions</h2>
      <ConditionsCard conditions={payload.conditions} />
    </div>
  );
}
