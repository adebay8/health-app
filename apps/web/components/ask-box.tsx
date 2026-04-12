'use client';

import { useState } from 'react';
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
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
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
            {isLoading ? 'Asking…' : 'Ask'}
          </Button>
        </form>
        {answer && (
          <div className="rounded-md border border-emerald-200 bg-white p-3 text-sm dark:border-emerald-900 dark:bg-background">
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
