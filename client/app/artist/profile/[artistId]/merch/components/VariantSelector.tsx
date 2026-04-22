import { cn } from "@/lib/utils";

export function VariantSelector({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
              selected === opt
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}