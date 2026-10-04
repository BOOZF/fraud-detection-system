import type { Alert, AlertDetail, Brief, DeleteResult, DocumentInfo, Kpis, ModelInfo, ScoreResult } from "./types";

// Same-origin by default: next.config.ts proxies /api/* to the FastAPI backend, so the browser
// never needs to reach the backend port (which is not forwarded by the VS Code dev tunnel).
// Set NEXT_PUBLIC_API_URL only to bypass the proxy.
const base = () => process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const getKpis = () => request<Kpis>("/api/kpis");
export const getModel = () => request<ModelInfo>("/api/model");

export const getAlerts = (minProb = 0, limit = 5000) =>
  request<Alert[]>(`/api/alerts?min_prob=${minProb}&limit=${limit}`);

export const getAlert = (id: number | string) => request<AlertDetail>(`/api/alerts/${id}`);

export const rescore = () => request<ScoreResult>("/api/score", { method: "POST" });

export const getBrief = (txnId: number) => request<Brief>(`/api/alerts/${txnId}/brief`, { method: "POST" });

export const getDocuments = () => request<DocumentInfo[]>("/api/documents");

// No Content-Type header: the browser must add the multipart boundary itself.
export const uploadDocument = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return request<DocumentInfo>("/api/documents", { method: "POST", body });
};

export const deleteDocument = (name: string) =>
  request<DeleteResult>(`/api/documents/${encodeURIComponent(name)}`, { method: "DELETE" });

/** Friendly text for an error thrown by request(): the backend's JSON `detail` when present. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong";
  const body = err.message.replace(/^\d{3}\s*/, "");
  try {
    const detail = (JSON.parse(body) as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) return detail;
  } catch {
    // not JSON, fall through
  }
  return err.message;
}
