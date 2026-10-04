/** URL of an uploaded document's original file. A PDF page opens in the browser's built-in viewer via `#page=N`. */
export function documentUrl(name: string, page?: number | null): string {
  const base = `/api/documents/${encodeURIComponent(name)}/file`;
  return page ? `${base}#page=${page}` : base;
}
