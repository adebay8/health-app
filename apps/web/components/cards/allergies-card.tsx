import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AllergyRecord } from '@health-app/shared-types';

function severityVariant(s: AllergyRecord['severity']): 'default' | 'secondary' | 'destructive' {
  if (s === 'severe') return 'destructive';
  if (s === 'moderate') return 'default';
  return 'secondary';
}

export function AllergiesCard({ allergies }: { allergies: AllergyRecord[] }) {
  if (allergies.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Allergies</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No allergies recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allergies ({allergies.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {allergies.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{a.substance}</div>
              {a.reaction && <div className="text-xs text-muted-foreground">Reaction: {a.reaction}</div>}
            </div>
            {a.severity && <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
