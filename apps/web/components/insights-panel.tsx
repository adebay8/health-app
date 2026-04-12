import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import type { InsightsResponse, InsightFlag } from '@health-app/shared-types';

function severityVariant(s: InsightFlag['severity']): 'default' | 'secondary' | 'destructive' {
  if (s === 'concern') return 'destructive';
  if (s === 'watch') return 'default';
  return 'secondary';
}

export function InsightsPanel({ insights }: { insights: InsightsResponse }) {
  const { flags, narration } = insights;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-900 dark:text-amber-200">
          Insights {flags.length > 0 ? `(${flags.length})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {narration && (
          <p className="text-sm text-amber-900 dark:text-amber-100">{narration}</p>
        )}
        {flags.length > 0 && (
          <div className="space-y-2">
            {flags.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-white p-2 text-sm dark:border-amber-900 dark:bg-background"
              >
                <div>
                  <div className="font-medium">
                    {f.metric ?? f.category}
                    {f.observedValue ? ` — ${f.observedValue}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">{f.message}</div>
                </div>
                <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
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
