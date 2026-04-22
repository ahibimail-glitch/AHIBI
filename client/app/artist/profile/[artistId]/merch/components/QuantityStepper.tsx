import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-card">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex h-10 w-12 items-center justify-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}