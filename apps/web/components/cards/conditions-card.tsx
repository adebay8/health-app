import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConditionRecord } from '@health-app/shared-types';

export function ConditionsCard({ conditions }: { conditions: ConditionRecord[] }) {
  if (conditions.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Conditions</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No conditions recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conditions ({conditions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {conditions.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{c.display}</div>
              {c.onsetDate && (
                <div className="text-xs text-muted-foreground">Onset: {c.onsetDate}</div>
              )}
            </div>
            <Badge variant={c.clinicalStatus === 'active' ? 'default' : 'secondary'}>
              {c.clinicalStatus}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
