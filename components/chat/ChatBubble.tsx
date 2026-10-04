"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, MessageCircle, Quote, RotateCcw, Send, SquarePen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/viewer/DocumentViewer";
import { Markdown } from "@/components/chat/Markdown";
import { useChat, type ChatMessage } from "@/components/chat/ChatProvider";
import type { ChatCitation } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

const STARTERS = [
  "How many transactions need an alert now?",
  "Break down the alerts by channel",
  "Which merchant categories have the most alerts?",
  "What is the total amount at risk in alerts?",
  "Summarize the key steps in the fraud policy",
];

const snippet = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

export function ChatBubble() {
  const { open, setOpen } = useChat();
  if (!open) {
    return (
      <Button
        type="button"
        size="icon"
        aria-label="Open copilot chat"
        className="fixed bottom-4 right-4 z-40 size-12 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <MessageCircle aria-hidden className="size-5" />
      </Button>
    );
  }
  return <ChatPanel />;
}

function ChatPanel() {
  const { messages, pending, error, context, alertId, focusToken, setOpen, send, retry, clear, clearContext } = useChat();
  const [draft, setDraft] = useState("");
  const [viewing, setViewing] = useState<ChatCitation | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, pending, error]);

  const submit = () => {
    if (!draft.trim() || pending) return;
    send(draft);
    setDraft("");
  };

  return (
    <>
      <Card
        role="complementary"
        aria-label="Fraud Copilot chat"
        data-no-ask
        onKeyDown={(e) => {
          if (e.key === "Escape" && !viewing) setOpen(false);
        }}
        className="fixed bottom-4 right-4 z-40 flex h-[min(560px,80vh)] w-[calc(100vw-2rem)] flex-col gap-0 py-0 shadow-xl sm:w-[380px]"
      >
        <CardHeader className="flex shrink-0 flex-row items-center gap-2 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-none">Fraud Copilot</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground">Ask about alerts, data and bank policies</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="New chat" onClick={clear}>
            <SquarePen aria-hidden className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Close chat" onClick={() => setOpen(false)}>
            <X aria-hidden className="size-4" />
          </Button>
        </CardHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
          {messages.length === 0 && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">Try one of these, or ask your own question.</p>
              {STARTERS.map((q) => (
                <Button key={q} type="button" variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => send(q)}>
                  {q}
                </Button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <MessageRow key={i} message={m} onCite={setViewing} />
          ))}
          {pending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Thinking…
            </div>
          )}
          {error && !pending && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <span className="min-w-0 flex-1">{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                <RotateCcw aria-hidden className="size-3.5" />
                Retry
              </Button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 space-y-2 border-t p-3">
          {context && (
            <div className="flex items-start gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
              <Quote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              {alertId !== null && (
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Alert #{alertId}</span>
              )}
              <span className="min-w-0 flex-1 break-words">Selected text: “{snippet(context, 120)}”</span>
              <button type="button" aria-label="Remove selected text" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={clearContext}>
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={draft}
              aria-label="Message"
              placeholder="Ask the copilot…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="min-h-0 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="button" size="sm" aria-label="Send" disabled={pending || !draft.trim()} onClick={submit}>
              <Send aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.doc}</DialogTitle>
                <DialogDescription>Cited source</DialogDescription>
              </DialogHeader>
              <DocumentViewer
                className="h-[70vh]"
                target={{ doc: viewing.doc, section: viewing.section, page: viewing.page, text: viewing.text }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MessageRow({ message, onCite }: { message: ChatMessage; onCite: (c: ChatCitation) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      {isUser && message.alertId !== undefined && (
        <p className="text-xs font-medium text-muted-foreground">About alert #{message.alertId}</p>
      )}
      {isUser && message.context && (
        <p className="max-w-[85%] truncate border-l-2 pl-2 text-xs italic text-muted-foreground">“{snippet(message.context, 80)}”</p>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <Markdown text={message.content} />}
      </div>
      {message.citations && message.citations.length > 0 && (
        <div className="flex max-w-[95%] flex-wrap gap-1">
          {message.citations.map((c, i) => (
            <button
              key={`${c.doc}-${c.chunk_id}-${i}`}
              type="button"
              onClick={() => onCite(c)}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <FileText aria-hidden className="size-3" />
              {c.doc} · {c.section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
