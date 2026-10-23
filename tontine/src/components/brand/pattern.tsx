// Triangle de coin plein (prune) avec un éventail de traits or, inspiré des motifs
// géométriques textiles ouest-africains — à poser aux coins opposés d'une page claire
// (inscription, connexion...), toujours aria-hidden. "top-right" : coin en haut à droite ;
// "bottom-left" : même forme retournée, en bas à gauche (plus grande, comme à l'accueil).
export function BrandCornerFlourish({
  corner,
  className,
}: {
  corner: "top-right" | "bottom-left";
  className?: string;
}) {
  const clipId = `brand-corner-flourish-${corner}`;
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={className}
      style={corner === "bottom-left" ? { transform: "rotate(180deg)" } : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M200 0 L200 170 L30 0 Z" />
        </clipPath>
      </defs>
      <path d="M200 0 L200 170 L30 0 Z" fill="var(--brand)" />
      <g clipPath={`url(#${clipId})`} stroke="var(--brand-gold)" strokeWidth="2" opacity="0.55">
        <path d="M200 20 L60 0" />
        <path d="M200 45 L85 0" />
        <path d="M200 70 L110 0" />
        <path d="M200 95 L135 0" />
        <path d="M200 120 L160 0" />
      </g>
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
