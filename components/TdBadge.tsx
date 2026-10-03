import { Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TdBadge({ className = "" }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      title="Computed by an in-database Teradata function"
      className={cn("whitespace-nowrap text-[10px] uppercase tracking-wide", className)}
    >
      <Database aria-hidden className="size-3" />
      Computed in Teradata
    </Badge>
  );
}
