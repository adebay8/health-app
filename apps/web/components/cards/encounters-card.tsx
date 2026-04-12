import { Calendar } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EncounterRecord } from '@health-app/shared-types';

export function EncountersCard({ encounters }: { encounters: EncounterRecord[] }) {
  if (encounters.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No visits recorded.</CardContent>
      </Card>
    );
  }

  const sorted = [...encounters].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Visits ({encounters.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {sorted.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{e.reason ?? 'Visit'}</div>
              <div className="text-xs text-muted-foreground">
                {e.startDate.slice(0, 10)}{e.providerName ? ` \u00b7 ${e.providerName}` : ''}
              </div>
            </div>
            <Badge variant="secondary">{e.type}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
