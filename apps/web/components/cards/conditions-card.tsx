import { Stethoscope } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConditionRecord } from '@health-app/shared-types';

export function ConditionsCard({ conditions }: { conditions: ConditionRecord[] }) {
  if (conditions.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No conditions recorded.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          Conditions ({conditions.length})
        </CardTitle>
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
