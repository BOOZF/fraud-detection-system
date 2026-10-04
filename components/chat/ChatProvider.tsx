"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";
import { sendChat } from "@/lib/chat";
import type { ChatCitation, ChatTurn } from "@/lib/chat-types";

export type ChatMessage = ChatTurn & {
  citations?: ChatCitation[];
  tools?: string[];
  /** Full highlighted text the user attached to this question. */
  context?: string;
  /** Alert the highlighted text belongs to, when it lay inside exactly one alert. */
  alertId?: number;
};

type ChatState = {
  open: boolean;
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  /** Highlighted text waiting to be sent with the next question. */
  context: string | null;
  /** Alert id attached together with the highlighted text. */
  alertId: number | null;
  /** Bumps each time the input should grab focus (opened from a selection). */
  focusToken: number;
  setOpen: (open: boolean) => void;
  send: (text: string) => void;
  retry: () => void;
  clear: () => void;
  askAbout: (text: string, alertId?: number) => void;
  clearContext: () => void;
};

const ChatContext = createContext<ChatState | null>(null);

export function useChat(): ChatState {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [alertId, setAlertId] = useState<number | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const generation = useRef(0);

  const ask = useCallback(async (history: ChatMessage[], ctx?: string, alert?: number) => {
    const gen = generation.current;
    setPending(true);
    setError(null);
    try {
      const turns = history.map(({ role, content }) => ({ role, content }));
      const res = await sendChat(turns, ctx, alert);
      if (gen !== generation.current) return;
      setMessages([...history, { role: "assistant", content: res.answer, citations: res.citations, tools: res.tools }]);
    } catch (err) {
      if (gen !== generation.current) return;
      setError(errorMessage(err));
    } finally {
      if (gen === generation.current) setPending(false);
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || pending) return;
      const ctx = context ?? undefined;
      const alert = ctx && alertId !== null ? alertId : undefined;
      const history = [
        ...messages,
        { role: "user" as const, content, ...(ctx ? { context: ctx } : {}), ...(alert !== undefined ? { alertId: alert } : {}) },
      ];
      setMessages(history);
      setContext(null);
      setAlertId(null);
      void ask(history, ctx, alert);
    },
    [ask, context, alertId, messages, pending],
  );

  const retry = useCallback(() => {
    const last = messages[messages.length - 1];
    if (pending || !last || last.role !== "user") return;
    void ask(messages, last.context, last.alertId);
  }, [ask, messages, pending]);

  const clear = useCallback(() => {
    generation.current += 1;
    setMessages([]);
    setPending(false);
    setError(null);
    setContext(null);
    setAlertId(null);
  }, []);

  const askAbout = useCallback((text: string, alert?: number) => {
    setContext(text);
    setAlertId(alert ?? null);
    setOpen(true);
    setFocusToken((n) => n + 1);
  }, []);

  const clearContext = useCallback(() => {
    setContext(null);
    setAlertId(null);
  }, []);

  const value = useMemo<ChatState>(
    () => ({ open, messages, pending, error, context, alertId, focusToken, setOpen, send, retry, clear, askAbout, clearContext }),
    [open, messages, pending, error, context, alertId, focusToken, send, retry, clear, askAbout, clearContext],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
