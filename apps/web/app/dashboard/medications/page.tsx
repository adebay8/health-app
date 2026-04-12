import { getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { MedicationsCard } from '@/components/cards/medications-card';
import { AllergiesCard } from '@/components/cards/allergies-card';

export default async function MedicationsPage() {
  const patientId = await getCurrentPatientId();
  const payload = await getPatient(patientId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Medications</h2>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <MedicationsCard medications={payload.medications} />
        <AllergiesCard allergies={payload.allergies} />
      </div>
    </div>
  );
}
