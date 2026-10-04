import type { ChatReply, ChatTurn } from "@/lib/chat-types";

export const MAX_HISTORY = 20;
export const MAX_CONTENT = 4000;
export const MAX_CONTEXT = 1500;

/** POST the conversation to the copilot chat endpoint (same-origin through the Next proxy). */
export async function sendChat(messages: ChatTurn[], context?: string, alertId?: number): Promise<ChatReply> {
  const body: { messages: ChatTurn[]; context?: string; alert_id?: number } = {
    messages: messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) })),
  };
  if (context) body.context = context.slice(0, MAX_CONTEXT);
  if (alertId !== undefined) body.alert_id = alertId;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as ChatReply;
}
