import { afterEach, expect, it, vi } from "vitest";
import { sendChat } from "@/lib/chat";

afterEach(() => vi.unstubAllGlobals());

it("POSTs the history and context as JSON to /api/chat and returns the reply", async () => {
  const reply = { answer: "42", citations: [], tools: ["sql"] };
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(reply), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const out = await sendChat([{ role: "user", content: "hi" }], "ctx");

  expect(out).toEqual(reply);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/chat");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ messages: [{ role: "user", content: "hi" }], context: "ctx" });
});

it("keeps only the last 20 messages and truncates long content and context", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: "", citations: [], tools: [] })));
  vi.stubGlobal("fetch", fetchMock);
  const msgs = Array.from({ length: 25 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `m${i}` }));
  msgs[24] = { role: "user", content: "x".repeat(5000) };

  await sendChat(msgs, "c".repeat(2000));

  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.messages).toHaveLength(20);
  expect(body.messages[0].content).toBe("m5");
  expect(body.messages[19].content).toHaveLength(4000);
  expect(body.context).toHaveLength(1500);
});

it("omits context when none is given", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: "", citations: [], tools: [] })));
  vi.stubGlobal("fetch", fetchMock);
  await sendChat([{ role: "user", content: "hi" }]);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ messages: [{ role: "user", content: "hi" }] });
});

it("throws '<status> <body>' on a non-2xx response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"detail":"LLM down"}', { status: 502 })));
  await expect(sendChat([{ role: "user", content: "hi" }])).rejects.toThrow('502 {"detail":"LLM down"}');
});

it("includes alert_id only when an alert id is given", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ answer: "", citations: [], tools: [] })));
  vi.stubGlobal("fetch", fetchMock);
  await sendChat([{ role: "user", content: "hi" }], "ctx", 38067);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    messages: [{ role: "user", content: "hi" }],
    context: "ctx",
    alert_id: 38067,
  });
  await sendChat([{ role: "user", content: "hi" }], "ctx");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ messages: [{ role: "user", content: "hi" }], context: "ctx" });
});
