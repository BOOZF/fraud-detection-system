import { Fragment } from "react";

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Minimal, injection-safe markdown: **bold** and "- " bullet lines. Everything else is plain text. */
export function Markdown({ text }: { text: string }) {
  const blocks: ({ kind: "p"; text: string } | { kind: "ul"; items: string[] })[] = [];
  for (const line of text.split("\n")) {
    const bullet = /^\s*[-*] (.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return (
    <div className="space-y-1">
      {blocks.map((b, i) =>
        b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : b.text === "" ? (
          <div key={i} className="h-1" />
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {inline(b.text)}
          </p>
        ),
      )}
    </div>
  );
}
