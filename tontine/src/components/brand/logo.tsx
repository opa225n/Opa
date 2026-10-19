import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Symbole Tontine CI : un cercle (union, communauté) contenant quatre segments
// en pinwheel de longueur croissante (le principe même de la tontine — un
// tour qui circule entre les membres — et la progression vers la prospérité
// collective). Le segment le plus long, en or champagne, est l'accent : le
// tour qui aboutit. Reste lisible en silhouette monochrome (currentColor).
// ---------------------------------------------------------------------------

type MarkProps = {
  size?: number;
  className?: string;
  /** Rendu en une seule couleur (currentColor) — pour fonds sombres ou contextes à teinte unique. */
  monochrome?: boolean;
};

export function TontineMark({ size = 32, className, monochrome = false }: MarkProps) {
  const fill = monochrome
    ? { ring: "currentColor", peak: "currentColor", b: "currentColor", c: "currentColor", d: "currentColor" }
    : { ring: "var(--brand)", peak: "var(--brand-gold)", b: "var(--brand-emerald)", c: "var(--brand)", d: "var(--brand)" };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Tontine CI"
    >
      <circle cx="50" cy="50" r="45" stroke={fill.ring} strokeWidth="5" opacity={monochrome ? 1 : 0.9} />
      <rect x="42.5" y="10" width="15" height="24" rx="7.5" fill={fill.peak} />
      <rect x="42.5" y="14" width="15" height="20" rx="7.5" fill={fill.b} transform="rotate(90 50 50)" />
      <rect x="42.5" y="18" width="15" height="16" rx="7.5" fill={fill.c} transform="rotate(180 50 50)" />
      <rect x="42.5" y="22" width="15" height="12" rx="7.5" fill={fill.d} transform="rotate(270 50 50)" />
    </svg>
  );
}

type LogoProps = {
  size?: "sm" | "md" | "lg";
  /** "full" : symbole + nom. "compact" : symbole seul (espaces réduits, favicon, app icon). */
  variant?: "full" | "compact";
  monochrome?: boolean;
  className?: string;
};

const MARK_SIZE: Record<NonNullable<LogoProps["size"]>, number> = { sm: 22, md: 28, lg: 36 };
const TEXT_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

export function TontineLogo({ size = "md", variant = "full", monochrome = false, className }: LogoProps) {
  const markSize = MARK_SIZE[size];

  if (variant === "compact") {
    return <TontineMark size={markSize} monochrome={monochrome} className={className} />;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TontineMark size={markSize} monochrome={monochrome} />
      <span className={cn("flex items-baseline gap-1.5 font-bold tracking-tight", TEXT_SIZE[size])}>
        <span className={monochrome ? "text-current" : "text-[var(--brand)]"}>Tontine</span>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[0.62em] font-bold tracking-wide",
            monochrome ? "border border-current" : "bg-[var(--brand)] text-[var(--brand-gold)]"
          )}
        >
          CI
        </span>
      </span>
    </span>
  );
}
