import { cn } from "@/lib/utils";

// Painted far to near: the farthest echo is the lightest. Offsets are in em, applied on both axes.
const ECHOES = [
  { offset: 0.16, color: "#d9d9d9" },
  { offset: 0.12, color: "#d0d0d0" },
  { offset: 0.08, color: "#c8c8c8" },
  { offset: 0.04, color: "#bfbfbf" },
];

/** Front copy in #111111 plus four aria-hidden copies layered behind it, each shifted up and left. */
export function EchoText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)} style={{ marginLeft: "0.16em", marginTop: "0.16em" }}>
      {ECHOES.map(({ offset, color }) => (
        <span
          key={offset}
          aria-hidden
          data-echo=""
          className="pointer-events-none absolute inset-0 select-none"
          style={{ color, transform: `translate(${-offset}em, ${-offset}em)` }}
        >
          {children}
        </span>
      ))}
      <span className="relative" style={{ color: "#111111" }}>
        {children}
      </span>
    </span>
  );
}
