import type { Alert, AlertDetail, CopilotResponse, Kpis, ModelInfo, ScoreResult } from "./types";

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

export const askCopilot = (txn_id: number, question: string) =>
  request<CopilotResponse>("/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txn_id, question }),
  });
