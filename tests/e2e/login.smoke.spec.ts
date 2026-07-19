import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Login — smoke E2E", () => {
  test("la página de login carga con su formulario", async ({ page }) => {
    const response = await page.goto("/internal/login");
    expect(response?.ok()).toBeTruthy();

    // El formulario de login debe estar presente sin depender del backend.
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /entrar al portal interno/i }),
    ).toBeVisible();
  });

  test("sin violaciones de accesibilidad serias o críticas", async ({
    page,
  }) => {
    await page.goto("/internal/login");
    const { violations } = await new AxeBuilder({ page }).analyze();

    // El objetivo del plan (FASE 12) es cero serias/críticas; las menores se
    // atacan aparte para no volver el gate ruidoso.
    const graves = violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(graves, JSON.stringify(graves.map((v) => v.id))).toEqual([]);
  });
});
