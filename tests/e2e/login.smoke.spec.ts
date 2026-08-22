import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Login — smoke E2E", () => {
  // Sin sesión: esta suite prueba justamente la pantalla que se ve ANTES de tenerla, y con el
  // estado autenticado del proyecto el portal redirige y no hay formulario que comprobar.
  test.use({ storageState: { cookies: [], origins: [] } });

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
    // Esperar a que TERMINEN las animaciones de entrada antes de medir.
    //
    // La pantalla aparece con un fundido, y axe calcula el contraste sobre el color YA COMPUESTO
    // con la opacidad del momento: escaneando a media animación, cada texto de la página —incluido
    // el título— daba «contraste insuficiente» y el gate fallaba con una lista de violaciones que
    // desaparecían solas un segundo después. No es un `waitForTimeout` disfrazado: se consulta a la
    // propia API de animaciones del documento, así que espera lo que dure y ni un milisegundo más.
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState === "finished"),
    );
    const { violations } = await new AxeBuilder({ page }).analyze();

    // El objetivo del plan (FASE 12) es cero serias/críticas; las menores se
    // atacan aparte para no volver el gate ruidoso.
    const graves = violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(graves, JSON.stringify(graves.map((v) => v.id))).toEqual([]);
  });
});
