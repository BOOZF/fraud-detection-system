import { Fragment } from "react";
import type { ChatCitation } from "@/lib/chat-types";

type Refs = { citations?: ChatCitation[]; onCite?: (c: ChatCitation) => void };

const REF = /\[([^[\]]+?\.(?:pdf|md|txt))\s+(pp?\.\s?\d+(?:\s?-\s?\d+)?)\]/gi;

/** The retrieved source a '[document p.N]' reference points at: same document, N inside the chunk's page range. */
function sourceOf(doc: string, label: string, citations: ChatCitation[]) {
  const page = Number(/\d+/.exec(label)![0]);
  return citations.find((c) => {
    if (c.doc !== doc || c.page === null) return false;
    const last = Number(c.section.split("-").pop()!.replace(/\D/g, "")) || c.page;
    return c.page <= page && page <= last;
  });
}

/** Plain text with each resolvable reference turned into a small clickable page chip. */
function withRefs(text: string, refs: Refs, key: string) {
  if (!refs.citations?.length || !refs.onCite) return text;
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(REF)) {
    const source = sourceOf(m[1], m[2], refs.citations);
    if (!source) continue;
    out.push(text.slice(last, m.index));
    out.push(
      <button
        key={`${key}-${m.index}`}
        type="button"
        aria-label={`Open ${source.doc} ${source.section}`}
        onClick={() => refs.onCite!(source)}
        className="mx-0.5 inline-flex items-center rounded-full border border-primary/40 px-1.5 text-[10px] font-medium leading-4 text-primary hover:bg-primary/10"
      >
        {`p.${/\d+/.exec(m[2])![0]}`}
      </button>,
    );
    last = m.index + m[0].length;
  }
  return out.length ? [...out, text.slice(last)] : text;
}

function inline(text: string, refs: Refs) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{withRefs(part, refs, String(i))}</Fragment>
    ),
  );
}

type Align = "left" | "right" | "center";
type Block =
  | { kind: "p"; text: string }
  | { kind: "label"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "table"; head: string[]; align: Align[]; rows: string[][] };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
const isRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isDivider = (line: string) => isRow(line) && cells(line).every((c) => /^:?-{2,}:?$/.test(c));
const alignOf = (c: string): Align => (c.endsWith(":") ? (c.startsWith(":") ? "center" : "right") : "left");
const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

function parse(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isRow(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map(alignOf);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]));
      i--;
      blocks.push({ kind: "table", head, align, rows });
      continue;
    }
    const bullet = /^\s*[-*] (.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
    } else if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      blocks.push({ kind: "label", text: line.trim().slice(2, -2) });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks;
}

/** Minimal, injection-safe markdown: **bold**, "- " bullet lines and pipe tables. Everything else is plain text. */
export function Markdown({ text, citations, onCite }: { text: string } & Refs) {
  const refs = { citations, onCite };
  return (
    <div className="space-y-1">
      {parse(text).map((b, i) =>
        b.kind === "table" ? (
          <div key={i} className="my-1 overflow-x-auto rounded-md border bg-background">
            <table className="w-full border-collapse text-xs tabular-nums">
              <thead className="bg-muted/60">
                <tr>
                  {b.head.map((h, j) => (
                    <th key={j} scope="col" className={`px-2.5 py-1.5 font-semibold ${ALIGN[b.align[j] ?? "left"]}`}>
                      {inline(h, refs)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className="border-t">
                    {row.map((c, j) => (
                      <td key={j} className={`px-2.5 py-1.5 ${ALIGN[b.align[j] ?? "left"]}`}>
                        {inline(c, refs)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : b.kind === "label" ? (
          <p key={i} data-testid="section-label" className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {b.text}
          </p>
        ) : b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{inline(item, refs)}</li>
            ))}
          </ul>
        ) : b.text === "" ? (
          <div key={i} className="h-1" />
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {inline(b.text, refs)}
          </p>
        ),
      )}
    </div>
  );
}
