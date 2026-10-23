import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
}: {
  /** 0-100 */
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-white/20", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full bg-[var(--brand-gold)] transition-[width]", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
