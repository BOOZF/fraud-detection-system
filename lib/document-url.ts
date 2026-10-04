/**
 * URL of an uploaded document's original file. A PDF page opens in the browser's built-in viewer via `#page=N`.
 * With a chunk id (a citation) the server returns the PDF with that cited passage highlighted.
 */
export function documentUrl(name: string, page?: number | null, chunkId?: number | null): string {
  const base = `/api/documents/${encodeURIComponent(name)}/file${chunkId ? `?chunk=${chunkId}` : ""}`;
  return page ? `${base}#page=${page}` : base;
}
