import { cn } from "@/lib/utils";

const colorClasses: Record<string, string> = {
  red: "bg-red-brand/20 text-red-danger border-red-brand/40",
  gold: "bg-gold-brand/20 text-gold-brand border-gold-brand/40",
  green: "bg-success/20 text-success border-success/40",
  amber: "bg-warning/20 text-warning border-warning/40",
  cream: "bg-cream/15 text-cream border-cream/30",
  deep: "bg-red-deep/30 text-red-danger border-red-deep/50",
};

export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlayerAvatar({
  name,
  colorKey,
  size = "md",
  className,
}: {
  name: string;
  colorKey?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-black",
        colorClasses[colorKey ?? "gold"] ?? colorClasses.gold,
        sizeClasses,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
