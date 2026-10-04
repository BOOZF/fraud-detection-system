"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useChat } from "@/components/chat/ChatProvider";

const MIN_CHARS = 3;
const MAX_CHARS = 1500;
const BTN_W = 120;
const BTN_H = 32;
const MARGIN = 8;
const BLOCKED = "[data-no-ask], input, textarea, [contenteditable]:not([contenteditable='false'])";

type Offer = { text: string; alertId?: number; top: number; left: number };

const asElement = (n: Node | null): Element | null => (n instanceof Element ? n : (n?.parentElement ?? null));

/** Alert id of the single data-alert-id element enclosing the node, if any (the common ancestor must be inside it). */
function alertIdOf(node: Node): number | undefined {
  const raw = asElement(node)?.closest("[data-alert-id]")?.getAttribute("data-alert-id");
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  return Number(raw);
}

function readSelection(): Offer | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const text = sel.toString().trim();
  if (text.length < MIN_CHARS || text.length > MAX_CHARS) return null;
  const range = sel.getRangeAt(0);
  const active = document.activeElement;
  if (active && active.matches("input, textarea, [contenteditable]:not([contenteditable='false'])")) return null;
  for (const n of [range.commonAncestorContainer, sel.anchorNode, sel.focusNode]) {
    if (asElement(n)?.closest(BLOCKED)) return null;
  }
  const alertId = alertIdOf(range.commonAncestorContainer);
  if (typeof range.getBoundingClientRect !== "function") return null;
  const rects = typeof range.getClientRects === "function" ? Array.from(range.getClientRects()) : [];
  const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = rect.top - BTN_H - 6;
  if (top < MARGIN) top = rect.bottom + 6;
  top = Math.max(MARGIN, Math.min(top, vh - BTN_H - MARGIN));
  const left = Math.max(MARGIN, Math.min(rect.right - BTN_W / 2, vw - BTN_W - MARGIN));
  return { text, top, left, ...(alertId !== undefined ? { alertId } : {}) };
}

export function SelectionAsk() {
  const { askAbout } = useChat();
  const [offer, setOffer] = useState<Offer | null>(null);

  const update = useCallback(() => {
    const next = readSelection();
    setOffer((prev) =>
      next && prev && next.text === prev.text && next.alertId === prev.alertId && next.top === prev.top && next.left === prev.left ? prev : next,
    );
  }, []);

  useEffect(() => {
    const hide = () => setOffer(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Escape") update();
    };
    document.addEventListener("mouseup", update);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseup", update);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", hide, true);
    };
  }, [update]);

  if (!offer) return null;
  return (
    <button
      type="button"
      style={{ position: "fixed", top: offer.top, left: offer.left, width: BTN_W, height: BTN_H }}
      className="z-[60] inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        askAbout(offer.text, offer.alertId);
        window.getSelection()?.removeAllRanges();
        setOffer(null);
      }}
    >
      <Sparkles aria-hidden className="size-3.5" />
      Ask copilot
    </button>
  );
}
