import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MedicationRecord } from '@health-app/shared-types';

export function MedicationsCard({ medications }: { medications: MedicationRecord[] }) {
  if (medications.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Medications</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No medications recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Medications ({medications.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {medications.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{m.display}</div>
              {m.dosage && <div className="text-xs text-muted-foreground">{m.dosage}</div>}
            </div>
            <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
