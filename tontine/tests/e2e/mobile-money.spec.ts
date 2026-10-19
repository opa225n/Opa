import { test, expect } from "@playwright/test";

test("Paiement Mobile Money en mode démonstration : initiation puis simulation du prestataire", async ({
  page,
}) => {
  await test.step("Connexion avec le compte de démonstration", async () => {
    await page.goto("/connexion");
    await page.getByLabel("Numéro de téléphone").fill("+225070000010");
    await page.getByLabel("Mot de passe").fill("Demo1234!");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  let tontineUrl = "";

  await test.step("Ouvrir la tontine de démonstration et aller sur Cotisations", async () => {
    await page.goto("/tontines");
    await page.getByText("[DÉMO] Tontine des Collègues").click();
    await expect(page).toHaveURL(/\/tontines\/.+$/, { timeout: 15000 });
    tontineUrl = page.url();
    await page.goto(`${tontineUrl}/cotisations`);
    await expect(page.getByText("Payer via Mobile Money").first()).toBeVisible({ timeout: 10000 });
  });

  const selfCard = page.locator('[data-testid^="contribution-card-"]').filter({ hasText: "Aïcha Koné" });

  await test.step("Initier un paiement Mobile Money (démo) sur sa propre cotisation", async () => {
    await selfCard.getByRole("button", { name: "Payer via Mobile Money" }).click();
    await selfCard.getByRole("button", { name: "Initier le paiement" }).click();

    await expect(selfCard.getByText(/\[DÉMO\] Paiement initié/)).toBeVisible({ timeout: 10000 });
    await expect(selfCard.getByText("[DÉMO] Simuler succès")).toBeVisible();
  });

  await test.step("Simuler la confirmation du prestataire : la cotisation passe à Confirmé", async () => {
    await selfCard.getByRole("button", { name: "[DÉMO] Simuler succès" }).click();
    await expect(selfCard.getByText("Confirmé", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});
