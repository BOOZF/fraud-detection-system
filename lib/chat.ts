import type { ChatReply, ChatStep, ChatTurn } from "@/lib/chat-types";

export const MAX_HISTORY = 20;
export const MAX_CONTENT = 4000;
export const MAX_CONTEXT = 1500;

function requestBody(messages: ChatTurn[], context?: string, alertId?: number) {
  const body: { messages: ChatTurn[]; context?: string; alert_id?: number } = {
    messages: messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) })),
  };
  if (context) body.context = context.slice(0, MAX_CONTEXT);
  if (alertId !== undefined) body.alert_id = alertId;
  return JSON.stringify(body);
}

/** POST the conversation to the copilot chat endpoint (same-origin through the Next proxy). */
export async function sendChat(messages: ChatTurn[], context?: string, alertId?: number): Promise<ChatReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody(messages, context, alertId),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as ChatReply;
}

export type StreamHandlers = {
  /** What the copilot is doing: called again with the same id when a step finishes. */
  onStep?: (step: ChatStep) => void;
  /** The whole answer written so far, in its final layout. Replace, do not append. */
  onAnswer?: (text: string) => void;
};

type StreamEvent =
  | ({ type: "step" } & ChatStep)
  | { type: "answer"; text: string }
  | ({ type: "done" } & ChatReply)
  | { type: "error"; message: string };

/** Like sendChat, but the answer arrives as server-sent events while it is being written. Resolves with the final reply. */
export async function streamChat(
  messages: ChatTurn[],
  context: string | undefined,
  alertId: number | undefined,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<ChatReply> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody(messages, context, alertId),
    signal,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (!res.body) throw new Error("The stream ended before the answer was complete");

  let final: ChatReply | null = null;
  const handle = (block: string) => {
    const line = block.split("\n").find((l) => l.startsWith("data: "));
    if (!line) return;
    const event = JSON.parse(line.slice(6)) as StreamEvent;
    if (event.type === "step") handlers.onStep?.({ id: event.id, label: event.label, status: event.status, detail: event.detail });
    else if (event.type === "answer") handlers.onAnswer?.(event.text);
    else if (event.type === "error") throw new Error(event.message);
    else if (event.type === "done") final = { answer: event.answer, citations: event.citations, tools: event.tools, guardrail: event.guardrail };
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
      handle(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) handle(buffer);
  if (!final) throw new Error("The stream ended before the answer was complete");
  return final;
}
