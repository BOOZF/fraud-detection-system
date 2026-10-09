const MAX_QUOTE_CHARS = 300;

/**
 * URL of an uploaded document's original file. A PDF page opens in the browser's built-in viewer via `#page=N`.
 * With a chunk id (a citation) the server returns the PDF with that cited paragraph highlighted; with a quote as well,
 * the key sentence inside the paragraph is highlighted in a stronger colour.
 */
export function documentUrl(name: string, page?: number | null, chunkId?: number | null, quote?: string | null): string {
  const params: string[] = [];
  if (chunkId) {
    params.push(`chunk=${chunkId}`);
    if (quote) params.push(`quote=${encodeURIComponent(quote.slice(0, MAX_QUOTE_CHARS))}`);
  }
  const base = `/api/documents/${encodeURIComponent(name)}/file${params.length ? `?${params.join("&")}` : ""}`;
  return page ? `${base}#page=${page}` : base;
}
