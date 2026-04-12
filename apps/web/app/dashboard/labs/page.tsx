import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { LabsCard } from '@/components/cards/labs-card';

export default async function LabsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Labs &amp; Vitals</h2>
      <LabsCard observations={payload.observations} />
    </div>
  );
}
