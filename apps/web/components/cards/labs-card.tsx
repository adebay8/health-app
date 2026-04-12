import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ObservationRecord } from '@health-app/shared-types';

function interpretationVariant(i: ObservationRecord['interpretation']): 'default' | 'secondary' | 'destructive' {
  if (i === 'critical' || i === 'high' || i === 'low') return 'destructive';
  if (i === 'normal') return 'secondary';
  return 'default';
}

export function LabsCard({ observations }: { observations: ObservationRecord[] }) {
  const labs = observations.filter((o) => o.category === 'lab');
  const vitals = observations.filter((o) => o.category === 'vital-sign');

  if (labs.length === 0 && vitals.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Labs &amp; Vitals</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No observations recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Labs &amp; Vitals ({labs.length + vitals.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {labs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Labs</div>
            {labs.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3">
                <div className="font-medium">{o.display}</div>
                <div className="flex items-center gap-2">
                  <span>{o.value}{o.unit ? ` ${o.unit}` : ''}</span>
                  {o.interpretation && (
                    <Badge variant={interpretationVariant(o.interpretation)}>{o.interpretation}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {vitals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Vitals</div>
            {vitals.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3">
                <div className="font-medium">{o.display}</div>
                <span>{o.value}{o.unit ? ` ${o.unit}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
