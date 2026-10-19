import { test, expect } from "@playwright/test";

function randomPhone() {
  const suffix = Math.floor(100000 + Math.random() * 899999);
  return `+22507${suffix}`;
}

test("Parcours principal : inscription, création de tontine, démarrage refusé avec 1 membre", async ({
  page,
}) => {
  const phone = randomPhone();
  const fullName = "Test E2E Utilisateur";
  const password = "MotDePasse1234";

  await test.step("Un visiteur peut créer un compte", async () => {
    await page.goto("/inscription");
    await page.getByLabel("Nom complet").fill(fullName);
    await page.getByLabel("Numéro de téléphone").fill(phone);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByLabel(/J'accepte les conditions/).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  });

  let tontineUrl = "";

  await test.step("L'utilisateur peut créer une tontine rotative", async () => {
    await page.goto("/tontines/nouveau");
    await page.getByLabel("Nom de la tontine").fill("Tontine E2E Test");
    await page.getByLabel("Montant de cotisation (FCFA)").fill("15000");
    await page.getByRole("button", { name: "Créer la tontine" }).click();

    await expect(page).toHaveURL(/\/tontines\/.+\/membres/, { timeout: 15000 });
    tontineUrl = page.url().replace(/\/membres$/, "");
    await expect(page.getByText(fullName)).toBeVisible();
    await expect(page.getByText("(vous)")).toBeVisible();
  });

  await test.step("Le responsable ne peut pas démarrer une tontine avec un seul membre", async () => {
    await page.goto(tontineUrl);
    await expect(page.getByText("Tontine en préparation")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Démarrer la tontine" }).click();
    await expect(
      page.getByText("Il faut au moins 2 membres actifs pour démarrer une tontine rotative.")
    ).toBeVisible({ timeout: 10000 });
  });

  await test.step("Se déconnecter puis se reconnecter avec le même compte", async () => {
    await page.getByRole("button", { name: "Déconnexion" }).click();
    await expect(page).toHaveURL(/\/$|\/connexion/, { timeout: 10000 });

    await page.goto("/connexion");
    await page.getByLabel("Numéro de téléphone").fill(phone);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});
