import "server-only";

/** Résout l'hôte régional de l'API Bird (https://bird.com) à partir du préfixe de la clé. */
const BIRD_API_BASE: Record<string, string> = {
  bk_eu1: "https://eu1.platform.bird.com",
  bk_us1: "https://us1.platform.bird.com",
};

export function getBirdApiBase(apiKey: string): string {
  const region = apiKey.startsWith("bk_eu1_") ? "bk_eu1" : apiKey.startsWith("bk_us1_") ? "bk_us1" : null;
  if (!region) {
    throw new Error("BIRD_API_KEY a un format inattendu (préfixe bk_eu1_ ou bk_us1_ attendu).");
  }
  return BIRD_API_BASE[region];
}
