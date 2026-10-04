"use client";

import { ExternalLink, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentUrl } from "@/lib/document-url";
import { cn } from "@/lib/utils";

/** What a citation points at: a document plus the chunk's section label, first PDF page (if any) and excerpt. */
export type ViewerTarget = { doc: string; section: string; page: number | null; text: string };

export function DocumentViewer({
  target,
  onClose,
  className,
}: {
  target: ViewerTarget;
  onClose?: () => void;
  className?: string;
}) {
  const isPdf = target.doc.toLowerCase().endsWith(".pdf");
  const url = documentUrl(target.doc, isPdf ? target.page : null);

  return (
    <section aria-label={`Viewing ${target.doc}`} className={cn("flex min-h-0 flex-col rounded-lg border bg-card", className)}>
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{target.doc}</span>
        <Badge variant="secondary" className="shrink-0">
          {isPdf && target.page ? `Page ${target.page}` : `Section ${target.section}`}
        </Badge>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          Open in new tab
        </a>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Close viewer" onClick={onClose}>
            <X aria-hidden className="size-4" />
          </Button>
        )}
      </header>
      {isPdf ? (
        // `key` remounts the frame so the browser's PDF viewer jumps to the new page.
        <iframe
          key={url}
          src={url}
          title={target.page ? `${target.doc}, page ${target.page}` : target.doc}
          className="min-h-80 w-full flex-1 rounded-b-lg bg-muted"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Cited excerpt</p>
          <blockquote className="whitespace-pre-wrap border-l-2 pl-3 text-sm leading-relaxed">{target.text}</blockquote>
        </div>
      )}
    </section>
  );
}
