"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export type RangeFilterProps = {
  id: string;
  label: string;
  /** Singular noun used in the handle names, e.g. "probability" -> "Minimum probability". */
  noun: string;
  bounds: [number, number];
  value: [number, number];
  step: number;
  format: (n: number) => string;
  onChange: (next: [number, number]) => void;
};

export function RangeFilter({ id, label, noun, bounds, value, step, format, onChange }: RangeFilterProps) {
  return (
    <div className="w-full min-w-56 flex-1 space-y-3 sm:max-w-xs">
      <div className="flex items-baseline justify-between gap-3">
        <Label id={`${id}-label`}>{label}</Label>
        <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          {format(value[0])} - {format(value[1])}
        </span>
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        min={bounds[0]}
        max={bounds[1]}
        step={step}
        value={value}
        onValueChange={(v) => onChange([v[0], v[1]])}
        thumbLabels={[`Minimum ${noun}`, `Maximum ${noun}`]}
      />
    </div>
  );
}
