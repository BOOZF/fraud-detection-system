"use client";

import { ExternalLink, FileText, PanelRightClose } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentUrl } from "@/lib/document-url";
import { cn } from "@/lib/utils";

/**
 * What to show: a citation (document + the chunk's section label, first PDF page, excerpt, chunk id so the server can
 * highlight it) or a whole document (empty `section` and `text`).
 */
export type ViewerTarget = { doc: string; section: string; page: number | null; text: string; chunkId?: number; focus?: string | null };

/** Full text of a non-PDF document, for opening it from the Documents page. */
function useFileText(doc: string, enabled: boolean) {
  const [loaded, setLoaded] = useState<{ doc: string; text: string } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(documentUrl(doc))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => !cancelled && setLoaded({ doc, text }))
      .catch(() => !cancelled && setLoaded({ doc, text: "Could not load this document." }));
    return () => {
      cancelled = true;
    };
  }, [doc, enabled]);
  return loaded?.doc === doc ? loaded.text : null;
}

export function DocumentViewer({
  target,
  onHide,
  className,
}: {
  target: ViewerTarget;
  /** Only for a viewer docked beside other content: hides the document and keeps the rest. A viewer inside a dialog
   *  leaves this off, because the dialog already has its own close button. */
  onHide?: () => void;
  className?: string;
}) {
  const isPdf = target.doc.toLowerCase().endsWith(".pdf");
  const url = documentUrl(target.doc, isPdf ? target.page : null, isPdf ? target.chunkId : null, target.focus);
  const wholeText = !isPdf && !target.text;
  const fileText = useFileText(target.doc, wholeText);
  const excerpt = wholeText ? (fileText ?? "Loading...") : target.text;

  return (
    <section aria-label={`Viewing ${target.doc}`} className={cn("flex min-h-0 flex-col rounded-lg border bg-card", className)}>
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{target.doc}</span>
        {(target.page || target.section) && (
          <Badge variant="secondary" className="shrink-0">
            {isPdf && target.page ? `Page ${target.page}` : `Section ${target.section}`}
          </Badge>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          Open in new tab
        </a>
        {onHide && (
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" aria-label="Hide document" onClick={onHide}>
            <PanelRightClose aria-hidden className="size-3.5" />
            Hide
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
          {!wholeText && <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Cited excerpt</p>}
          <blockquote className="whitespace-pre-wrap border-l-2 pl-3 text-sm leading-relaxed">{excerpt}</blockquote>
        </div>
      )}
    </section>
  );
}
