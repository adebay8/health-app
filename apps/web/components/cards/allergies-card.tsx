import { ShieldAlert } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AllergyRecord } from '@health-app/shared-types';

function severityBadge(s: AllergyRecord['severity']) {
  if (s === 'severe')
    return <Badge className="border-transparent bg-critical text-critical-foreground">{s}</Badge>;
  if (s === 'moderate')
    return <Badge className="border-transparent bg-warning text-warning-foreground">{s}</Badge>;
  if (s === 'mild')
    return <Badge variant="secondary">{s}</Badge>;
  return null;
}

export function AllergiesCard({ allergies }: { allergies: AllergyRecord[] }) {
  if (allergies.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No allergies recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Allergies ({allergies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {allergies.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{a.substance}</div>
              {a.reaction && <div className="text-xs text-muted-foreground">Reaction: {a.reaction}</div>}
            </div>
            {severityBadge(a.severity)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
