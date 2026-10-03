import { describe, it, expect, vi, beforeEach } from "vitest";
import { getKpis, getAlerts, getAlert, getModel, rescore, askCopilot } from "@/lib/api";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const ok = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: async () => body, text: async () => "" });

describe("api", () => {
  it("getKpis returns typed data from /api/kpis", async () => {
    const kpis = { total_txn: 1000, fraud_txn: 12, fraud_rate: 0.012, alerts_open: 5, fraud_by_channel: [], sql: ["SELECT 1"] };
    fetchMock.mockReturnValue(ok(kpis));
    const result = await getKpis();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/kpis");
    expect(result).toEqual(kpis);
  });
});

describe("api errors", () => {
  it("throws `${status} ${text}` on non-2xx", async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 404, text: async () => "not found" }));
    await expect(getKpis()).rejects.toThrow("404 not found");
  });
});

describe("api endpoints", () => {
  it("getAlerts defaults to every alert (min_prob=0, limit=5000)", async () => {
    fetchMock.mockReturnValue(ok([]));
    await getAlerts();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/alerts?min_prob=0&limit=5000");
  });

  it("getAlerts builds query string from explicit arguments", async () => {
    fetchMock.mockReturnValue(ok([]));
    await getAlerts(0.8, 50);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/alerts?min_prob=0.8&limit=50");
  });

  it("getAlert hits /api/alerts/{id}", async () => {
    fetchMock.mockReturnValue(ok({ prob: 0.9 }));
    await getAlert(42);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/alerts/42");
  });

  it("getModel hits /api/model", async () => {
    fetchMock.mockReturnValue(ok({ auc: 0.97 }));
    expect(await getModel()).toEqual({ auc: 0.97 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/model");
  });

  it("rescore POSTs with no body", async () => {
    fetchMock.mockReturnValue(ok({ rows: 10, seconds: 1.5, sql: "x" }));
    const r = await rescore();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/score");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    expect(r.rows).toBe(10);
  });

  it("askCopilot POSTs JSON body", async () => {
    fetchMock.mockReturnValue(ok({ answer: "a", citations: [], retrieval_ms: 1, llm_ms: 2 }));
    await askCopilot(7, "Why?");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/copilot");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init.body).toBe('{"txn_id":7,"question":"Why?"}');
  });
});
