import { Badge } from "@/components/ui/badge";

export function priorityOf(prob: number): "P1" | "P2" | null {
  if (prob >= 0.9) return "P1";
  if (prob >= 0.8) return "P2";
  return null;
}

export function ProbBadge({ prob }: { prob: number }) {
  const priority = priorityOf(prob);
  const variant = priority === "P1" ? "destructive" : priority === "P2" ? "warning" : "outline";
  return (
    <Badge variant={variant} className="tabular-nums">
      {priority && <span>{priority}</span>}
      <span>{Math.round(prob * 100)}%</span>
    </Badge>
  );
}
