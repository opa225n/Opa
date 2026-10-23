// Silhouette "flamme/pétale" partant du coin (200,0) : bord extérieur convexe jusqu'en bas à
// gauche, bord intérieur qui revient en S (taille pincée) — plus organique qu'un simple
// triangle ou arc unique.
const PETAL_PATH =
  "M200 0 C198 55 172 105 128 142 C98 167 55 183 0 192 C58 175 112 145 148 97 C176 60 194 27 200 0 Z";
// Juste le bord extérieur, pour le filet or qui le souligne.
const PETAL_OUTER_EDGE = "M200 0 C198 55 172 105 128 142 C98 167 55 183 0 192";

// Voile de coin : silhouette en flamme/pétale, dégradé prune, filet or le long du bord
// extérieur, et un semis de petits losanges emboîtés en deux tons terracotta/or à l'intérieur
// — inspiré des motifs géométriques textiles ouest-africains plutôt qu'un simple dégradé. À
// poser aux coins opposés d'une page claire (inscription, connexion...), toujours aria-hidden.
// "top-right" : coin en haut à droite ; "bottom-left" : même forme retournée à 180°.
export function BrandCornerFlourish({
  corner,
  className,
}: {
  corner: "top-right" | "bottom-left";
  className?: string;
}) {
  const clipId = `brand-corner-flourish-clip-${corner}`;
  const gradientId = `brand-corner-flourish-gradient-${corner}`;
  const patternId = `brand-corner-flourish-pattern-${corner}`;

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={className}
      style={corner === "bottom-left" ? { transform: "rotate(180deg)" } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="200" y1="0" x2="20" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-soft)" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={PETAL_PATH} />
        </clipPath>
        <pattern
          id={patternId}
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(20)"
        >
          <path d="M13 1 L24 13 L13 25 L2 13 Z" fill="#c2694a" opacity="0.4" />
          <path d="M13 7 L19 13 L13 19 L7 13 Z" fill="var(--brand-gold)" opacity="0.5" />
        </pattern>
      </defs>

      <path d={PETAL_PATH} fill={`url(#${gradientId})`} />

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="200" height="200" fill={`url(#${patternId})`} />
      </g>

      <path
        d={PETAL_OUTER_EDGE}
        fill="none"
        stroke="var(--brand-gold)"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

// Motif décoratif discret, inspiré de losanges/triangles entrelacés (écho du symbole
// "Nœud de Confiance") — à poser en coin d'une surface sombre, toujours aria-hidden et à
// faible opacité : une touche, jamais un habillage.
export function BrandCornerPattern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g stroke="var(--brand-gold)" strokeWidth="1.5" opacity="0.35">
        <path d="M160 20 L140 0" />
        <path d="M160 45 L115 0" />
        <path d="M160 70 L90 0" />
        <path d="M160 95 L65 0" />
        <path d="M160 120 L40 0" />
      </g>
    </svg>
  );
}
