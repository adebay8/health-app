import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import type { InsightsResponse, InsightFlag } from '@health-app/shared-types';

function severityBadge(f: InsightFlag) {
  if (f.severity === 'concern')
    return <Badge className="border-transparent bg-critical text-critical-foreground">{f.severity}</Badge>;
  if (f.severity === 'watch')
    return <Badge className="border-transparent bg-warning text-warning-foreground">{f.severity}</Badge>;
  return <Badge variant="secondary">{f.severity}</Badge>;
}

export function InsightsPanel({ insights }: { insights: InsightsResponse }) {
  const { flags, narration } = insights;

  return (
    <Card className="border-warning/30 bg-warning-muted shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-warning">
          <AlertTriangle className="h-4 w-4" />
          Insights {flags.length > 0 ? `(${flags.length})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {narration && (
          <p className="text-sm text-warning/90">{narration}</p>
        )}
        {flags.length > 0 && (
          <div className="space-y-2">
            {flags.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-md border border-warning/20 bg-card p-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {f.metric ?? f.category}
                    {f.observedValue ? ` — ${f.observedValue}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">{f.message}</div>
                </div>
                {severityBadge(f)}
              </div>
            ))}
          </div>
        )}
        {flags.length === 0 && !narration && (
          <p className="text-sm text-muted-foreground">Nothing flagged right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
