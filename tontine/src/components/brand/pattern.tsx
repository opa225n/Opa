// Points le long de la bordure courbe (quadratique, de (200,185) à (18,0) via (120,70)),
// pour un éventail de traits qui converge exactement sur le bord plutôt que dans le vide.
const FAN_POINTS: Array<[number, number]> = [
  [183.8, 162.5],
  [167.1, 140.8],
  [150.0, 120.1],
  [132.5, 100.2],
  [114.5, 81.3],
  [96.1, 63.2],
  [77.2, 46.1],
  [57.9, 29.8],
  [38.2, 14.5],
];

// Voile de coin : silhouette courbe (pas un simple triangle) en dégradé prune, bordée d'un
// filet or, avec un éventail de fins traits or qui convergent sur le bord — inspiré des
// motifs textiles ouest-africains, en écho discret au symbole "Nœud de Confiance". À poser
// aux coins opposés d'une page claire (inscription, connexion...), toujours aria-hidden.
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
  const edgePath = "M200 0 L200 185 Q120 70 18 0 Z";

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={className}
      style={corner === "bottom-left" ? { transform: "rotate(180deg)" } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="200" y1="0" x2="40" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-soft)" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={edgePath} />
        </clipPath>
      </defs>

      <path d={edgePath} fill={`url(#${gradientId})`} />

      <g clipPath={`url(#${clipId})`}>
        {FAN_POINTS.map(([x, y], i) => (
          <line
            key={i}
            x1="200"
            y1="0"
            x2={x}
            y2={y}
            stroke="var(--brand-gold)"
            strokeWidth="1"
            opacity={0.6 - (i / (FAN_POINTS.length - 1)) * 0.4}
          />
        ))}
      </g>

      <path
        d="M200 185 Q120 70 18 0"
        fill="none"
        stroke="var(--brand-gold)"
        strokeWidth="1.5"
        opacity="0.5"
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
