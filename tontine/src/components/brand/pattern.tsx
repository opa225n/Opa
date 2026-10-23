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
