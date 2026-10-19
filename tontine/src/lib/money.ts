// Tous les montants de l'application sont des entiers en FCFA (XOF).
// Jamais de nombres flottants : un montant est toujours un nombre entier de francs CFA.

const XOF_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatXof(amount: number): string {
  // Intl insère une espace fine insécable (U+202F) comme séparateur de milliers ;
  // on la normalise en espace classique, plus lisible et plus simple à copier/exporter.
  const formatted = XOF_FORMATTER.format(Math.round(amount)).replace(/ /g, " ");
  return `${formatted} FCFA`;
}

export function assertIntegerXof(amount: number, field = "montant"): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${field} doit être un entier positif (FCFA), reçu: ${amount}`);
  }
}
