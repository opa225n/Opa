import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Symbole Tontine CI — "Le Nœud de Confiance" : deux arcs ouverts, de teintes
// différentes, entrelacés en une boucle continue sans début ni fin. Deux
// parties liées par un engagement mutuel ininterrompu — le principe même
// d'une tontine. Reste lisible en silhouette monochrome (currentColor).
// ---------------------------------------------------------------------------

type MarkProps = {
  size?: number;
  className?: string;
  /** Rendu en une seule couleur (currentColor) — pour fonds sombres ou contextes à teinte unique. */
  monochrome?: boolean;
};

export function TontineMark({ size = 32, className, monochrome = false }: MarkProps) {
  const fill = monochrome ? { a: "currentColor", b: "currentColor" } : { a: "var(--brand)", b: "var(--brand-gold)" };

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
      <path
        d="M 55.56 65.56 A 22 22 0 1 1 55.56 34.44"
        stroke={fill.a}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M 44.44 34.44 A 22 22 0 1 1 44.44 65.56"
        stroke={fill.b}
        strokeWidth="9"
        strokeLinecap="round"
      />
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
