import { FlaskConical } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ObservationRecord } from '@health-app/shared-types';

function interpretationBadge(i: ObservationRecord['interpretation']) {
  if (i === 'critical')
    return <Badge className="border-transparent bg-critical text-critical-foreground">{i}</Badge>;
  if (i === 'high' || i === 'low')
    return <Badge className="border-transparent bg-warning text-warning-foreground">{i}</Badge>;
  if (i === 'normal')
    return <Badge className="border-transparent bg-healthy text-healthy-foreground">{i}</Badge>;
  return i ? <Badge variant="secondary">{i}</Badge> : null;
}

export function LabsCard({ observations }: { observations: ObservationRecord[] }) {
  const labs = observations.filter((o) => o.category === 'lab');
  const vitals = observations.filter((o) => o.category === 'vital-sign');

  if (labs.length === 0 && vitals.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Labs &amp; Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No observations recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          Labs &amp; Vitals ({labs.length + vitals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {labs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Labs</div>
            {labs.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3">
                <div className="font-medium">{o.display}</div>
                <div className="flex items-center gap-2">
                  <span>{o.value}{o.unit ? ` ${o.unit}` : ''}</span>
                  {interpretationBadge(o.interpretation)}
                </div>
              </div>
            ))}
          </div>
        )}
        {vitals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vitals</div>
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
