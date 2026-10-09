import { cn } from "@/lib/utils";

type TagVariant = "new" | "sold-out" | "draft" | "published" | "default";

const variantStyles: Record<TagVariant, string> = {
  new: "bg-primary/10 text-primary",
  "sold-out": "bg-destructive/10 text-destructive",
  draft: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  default: "bg-muted text-muted-foreground",
};

export function TagBadge({
  variant = "default",
  children,
  className,
}: {
  variant?: TagVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}