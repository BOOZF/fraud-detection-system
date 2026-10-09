import { afterEach, expect, it, vi } from "vitest";
import { streamChat } from "@/lib/chat";

afterEach(() => vi.unstubAllGlobals());

const sse = (...events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");

/** A fetch Response whose body arrives in the given pieces, like a real network stream. */
function streamed(pieces: string[], init: ResponseInit = { status: 200 }) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      pieces.forEach((p) => controller.enqueue(encoder.encode(p)));
      controller.close();
    },
  });
  return new Response(body, init);
}

const DONE = { type: "done", answer: "Final", citations: [], tools: ["alert_stats"], guardrail: null };

it("POSTs to /api/chat/stream with the same body as the plain endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(streamed([sse(DONE)]));
  vi.stubGlobal("fetch", fetchMock);
  await streamChat([{ role: "user", content: "hi" }], "ctx", 7, {});
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/chat/stream");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ messages: [{ role: "user", content: "hi" }], context: "ctx", alert_id: 7 });
});

it("reports steps and answer snapshots as they arrive and resolves with the final answer", async () => {
  const step = { type: "step", id: "s1", label: "Checking the question is about fraud", status: "running", detail: null };
  const stepDone = { ...step, status: "done" };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamed([sse(step, stepDone, { type: "answer", text: "Partial" }, { type: "answer", text: "Partial answer" }, DONE)])));
  const seen: string[] = [];
  const reply = await streamChat([{ role: "user", content: "hi" }], undefined, undefined, {
    onStep: (s) => seen.push(`step:${s.status}:${s.label}`),
    onAnswer: (t) => seen.push(`answer:${t}`),
  });
  expect(seen).toEqual(["step:running:Checking the question is about fraud", "step:done:Checking the question is about fraud", "answer:Partial", "answer:Partial answer"]);
  expect(reply).toEqual({ answer: "Final", citations: [], tools: ["alert_stats"], guardrail: null });
});

it("copes with events split across network chunks, even in the middle of a character", async () => {
  const text = sse({ type: "answer", text: "Café — ok" }, DONE);
  const bytes = new TextEncoder().encode(text);
  const cut = text.indexOf("é");
  const at = new TextEncoder().encode(text.slice(0, cut)).length + 1; // between the two bytes of "é"
  const encoder = { encode: () => bytes };
  void encoder;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes.slice(0, 9));
      c.enqueue(bytes.slice(9, at));
      c.enqueue(bytes.slice(at));
      c.close();
    },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
  const answers: string[] = [];
  await streamChat([{ role: "user", content: "hi" }], undefined, undefined, { onAnswer: (t) => answers.push(t) });
  expect(answers).toEqual(["Café — ok"]);
});

it("rejects with the server's message on an error event", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamed([sse({ type: "error", message: "Copilot unavailable: network down" })])));
  await expect(streamChat([{ role: "user", content: "hi" }], undefined, undefined, {})).rejects.toThrow("Copilot unavailable: network down");
});

it("rejects with '<status> <body>' when the request itself fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"detail":"alert not found"}', { status: 404 })));
  await expect(streamChat([{ role: "user", content: "hi" }], undefined, 1, {})).rejects.toThrow('404 {"detail":"alert not found"}');
});

it("rejects if the stream ends without a final answer", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamed([sse({ type: "answer", text: "half" })])));
  await expect(streamChat([{ role: "user", content: "hi" }], undefined, undefined, {})).rejects.toThrow(/ended/i);
});

it("passes the abort signal to fetch", async () => {
  const fetchMock = vi.fn().mockResolvedValue(streamed([sse(DONE)]));
  vi.stubGlobal("fetch", fetchMock);
  const controller = new AbortController();
  await streamChat([{ role: "user", content: "hi" }], undefined, undefined, {}, controller.signal);
  expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
});
