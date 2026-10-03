"use client";

import { Bot, Send } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { askCopilot } from "@/lib/api";
import type { CopilotResponse } from "@/lib/types";

const SUGGESTED = [
  "Why was this flagged?",
  "What does the SOP require me to do next?",
  "Should we report this to the regulator?",
];

interface Turn {
  question: string;
  response?: CopilotResponse;
  error?: string;
}

export function CopilotChat({ txnId }: { txnId: number }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setDraft("");
    try {
      const response = await askCopilot(txnId, q);
      setTurns((t) => [...t, { question: q, response }]);
    } catch (e) {
      setTurns((t) => [...t, { question: q, error: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot aria-hidden className="size-5" /> Fraud Copilot
        </CardTitle>
        <CardDescription>
          Answers grounded in the Malaysia XX Bank Fraud Operations SOP and cited by section. Runs on sovereign infrastructure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <Button key={q} type="button" variant="outline" size="sm" disabled={busy} onClick={() => ask(q)}>
              {q}
            </Button>
          ))}
        </div>

        <div className="space-y-5" aria-live="polite">
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-semibold">You: {t.question}</p>
              {t.error && (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  Copilot error: {t.error}
                </p>
              )}
              {t.response && (
                <div className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.response.answer}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {`retrieval ${t.response.retrieval_ms} ms | LLM ${(t.response.llm_ms / 1000).toFixed(1)} s`}
                    </Badge>
                  </div>
                  {t.response.citations.length > 0 && (
                    <ul className="space-y-2" aria-label="Citations">
                      {t.response.citations.map((c) => (
                        <li key={`${c.doc}-${c.chunk_id}`} className="rounded-md border bg-muted/50 p-3 text-sm">
                          <p className="font-medium">{c.doc} / chunk {c.chunk_id}</p>
                          <p className="text-muted-foreground">{c.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="text-sm text-muted-foreground">Retrieving from SOP and thinking...</p>}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Ask the copilot"
            placeholder="Ask about this transaction..."
          />
          <Button type="submit" disabled={busy}>
            <Send aria-hidden className="mr-1.5 size-4" /> Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
