import { getInsights, getPatient } from '@/lib/api-client';
import { getCurrentPatientId } from '@/lib/patient-context';
import { SummaryCard } from '@/components/cards/summary-card';
import { InsightsPanel } from '@/components/insights-panel';
import { ConditionsCard } from '@/components/cards/conditions-card';
import { MedicationsCard } from '@/components/cards/medications-card';
import { AllergiesCard } from '@/components/cards/allergies-card';
import { LabsCard } from '@/components/cards/labs-card';
import { EncountersCard } from '@/components/cards/encounters-card';
import { AskBox } from '@/components/ask-box';

export default async function DashboardPage() {
  const patientId = await getCurrentPatientId();
  const [payload, insights] = await Promise.all([
    getPatient(patientId),
    getInsights(patientId),
  ]);

  return (
    <div className="space-y-4">
      <SummaryCard payload={payload} />
      <InsightsPanel insights={insights} />
      <div className="grid gap-4 md:grid-cols-2">
        <ConditionsCard conditions={payload.conditions} />
        <MedicationsCard medications={payload.medications} />
        <AllergiesCard allergies={payload.allergies} />
        <LabsCard observations={payload.observations} />
      </div>
      <EncountersCard encounters={payload.encounters} />
      <AskBox patientId={patientId} />
    </div>
  );
}
