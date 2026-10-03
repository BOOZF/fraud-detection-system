"use client";

import { Code2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SqlPanel({ sql, label = "Show SQL" }: { sql: string | string[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const statements = Array.isArray(sql) ? sql : [sql];

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Code2 aria-hidden className="mr-1.5 size-4" />
        {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-label="SQL executed in Teradata"
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">SQL run in Teradata</h2>
                <p className="text-sm text-muted-foreground">Exactly what the engine executed. Auditable, no hidden logic.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                <X aria-hidden className="mr-1 size-4" />
                Close
              </Button>
            </div>
            {statements.map((s, i) => (
              <pre
                key={i}
                className="mb-4 overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted p-4 font-mono text-xs"
              >
                <code>{s}</code>
              </pre>
            ))}
          </aside>
        </div>
      )}
    </>
  );
}
