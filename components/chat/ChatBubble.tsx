"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FileText, Loader2, MessageCircle, Quote, RotateCcw, Send, SquarePen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentViewer } from "@/components/viewer/DocumentViewer";
import { Markdown } from "@/components/chat/Markdown";
import { useChat, type ChatMessage } from "@/components/chat/ChatProvider";
import type { ChatCitation, ChatStep } from "@/lib/chat-types";
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
                target={{ doc: viewing.doc, section: viewing.section, page: viewing.page, text: viewing.text, chunkId: viewing.chunk_id, focus: viewing.focus }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** What the copilot is doing, collapsed to its latest step while it works; expand to see every step. */
function ThinkingPanel({ steps, streaming }: { steps: ChatStep[]; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const latest = steps[steps.length - 1];
  return (
    <div className="w-full max-w-[95%] rounded-lg border bg-muted/40 text-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:text-foreground"
      >
        {streaming ? <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin" /> : <Check aria-hidden className="size-3.5 shrink-0" />}
        {streaming ? (
          <>
            <span className="font-medium text-foreground">Thinking…</span>
            {latest && <span className="min-w-0 flex-1 truncate">{latest.label}</span>}
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">How this was answered</span>
            <span className="min-w-0 flex-1 truncate">{steps.length} steps</span>
          </>
        )}
        <span className="sr-only">{open ? "Hide thinking" : "Show thinking"}</span>
        <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul aria-label="Thinking steps" className="space-y-1.5 border-t px-3 py-2">
          {steps.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              {s.status === "running" ? (
                <Loader2 aria-hidden className="mt-0.5 size-3 shrink-0 animate-spin text-primary" />
              ) : (
                <Check aria-hidden className="mt-0.5 size-3 shrink-0 text-emerald-600" />
              )}
              <span className="min-w-0">
                <span className="text-foreground">{s.label}</span>
                {s.detail && <span className="block text-muted-foreground">{s.detail}</span>}
                <span className="sr-only">{s.status === "running" ? "In progress" : "Done"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The cited paragraph, with the sentence the answer relies on marked (the same colour the PDF highlight uses). */
function Excerpt({ text, focus }: { text: string; focus?: string | null }) {
  const at = focus ? text.indexOf(focus) : -1;
  if (!focus || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-orange-200/80 px-0.5 text-foreground dark:bg-orange-500/30">{focus}</mark>
      {text.slice(at + focus.length)}
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
      {!isUser && (message.streaming || (message.steps && message.steps.length > 0)) && (
        <ThinkingPanel steps={message.steps ?? []} streaming={!!message.streaming} />
      )}
      {(isUser || message.content) && (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isUser || !message.content.includes("|") ? "max-w-[85%]" : "max-w-full",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <Markdown text={message.content} citations={message.citations} onCite={onCite} />}
        </div>
      )}
      {message.citations && message.citations.length > 0 && (
        <div className="flex w-full max-w-[95%] flex-col gap-2">
          {message.citations.map((c, i) => (
            <div
              key={`${c.doc}-${c.chunk_id}-${i}`}
              role="group"
              aria-label={`Source ${c.doc} · ${c.section}`}
              className="rounded-lg border bg-card p-2 text-xs"
            >
              <button
                type="button"
                onClick={() => onCite(c)}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FileText aria-hidden className="size-3" />
                {c.doc} · {c.section}
              </button>
              <blockquote className="mt-1.5 line-clamp-5 border-l-2 border-orange-400/70 pl-2 leading-relaxed text-muted-foreground">
                <Excerpt text={c.text} focus={c.focus} />
              </blockquote>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
