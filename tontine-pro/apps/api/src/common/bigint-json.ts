// Les montants sont stockés en BigInt (FCFA, entiers) mais JSON.stringify ne sait pas les sérialiser.
// Montants manipulés restent largement sous Number.MAX_SAFE_INTEGER (FCFA), donc une conversion simple suffit.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};
