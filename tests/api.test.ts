import { describe, it, expect, vi, beforeEach } from "vitest";
import { getKpis, getAlerts, getAlert, getModel, rescore, getBrief, getDocuments, uploadDocument, deleteDocument, errorMessage } from "@/lib/api";

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

  it("getBrief POSTs to the alert's brief endpoint with no body", async () => {
    fetchMock.mockReturnValue(ok({ txn_id: 7, items: [] }));
    const r = await getBrief(7);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/alerts/7/brief");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    expect(r.txn_id).toBe(7);
  });
});

describe("documents api", () => {
  it("getDocuments hits /api/documents", async () => {
    fetchMock.mockReturnValue(ok([]));
    await getDocuments();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents");
  });

  it("uploadDocument POSTs FormData with the file under `file` and no Content-Type header", async () => {
    fetchMock.mockReturnValue(ok({ doc: "a.md", kind: "md", pages: null, chunks: 7, bytes: 3, uploaded_at: "x" }));
    const file = new File(["abc"], "a.md", { type: "text/markdown" });
    await uploadDocument(file);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/documents");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBe(file);
    expect(init.headers).toBeUndefined();
  });

  it("deleteDocument URL-encodes the name", async () => {
    fetchMock.mockReturnValue(ok({ deleted: "a b.pdf", chunks: 2 }));
    await deleteDocument("a b.pdf");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/documents/a%20b.pdf");
    expect(init.method).toBe("DELETE");
  });

  it("throws on non-2xx", async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 404, text: async () => '{"detail":"nope"}' }));
    await expect(deleteDocument("x")).rejects.toThrow('404 {"detail":"nope"}');
  });
});

describe("errorMessage", () => {
  it("extracts detail from a JSON body", () => {
    expect(errorMessage(new Error('413 {"detail":"File is larger than 25 MB"}'))).toBe("File is larger than 25 MB");
  });
  it("falls back to the raw text for non-JSON bodies", () => {
    expect(errorMessage(new Error("502 Bad Gateway"))).toBe("502 Bad Gateway");
  });
  it("handles non-Error values", () => {
    expect(errorMessage("weird")).toBe("Something went wrong");
  });
});
