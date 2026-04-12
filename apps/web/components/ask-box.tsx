'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askQuestion } from '@/lib/api-client';

interface Props {
  patientId: string;
}

export function AskBox({ patientId }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await askQuestion(patientId, question.trim());
      setAnswer(res.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-info/30 bg-info-muted shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-info">
          <Sparkles className="h-4 w-4" />
          Ask about your health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What should I ask my doctor about my LDL?"
            disabled={isLoading}
            aria-label="Question"
          />
          <Button type="submit" disabled={isLoading || !question.trim()}>
            {isLoading ? 'Asking\u2026' : 'Ask'}
          </Button>
        </form>
        {answer && (
          <div className="rounded-md border border-info/20 bg-card p-3 text-sm">
            {answer}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
