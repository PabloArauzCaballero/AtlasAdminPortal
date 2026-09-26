import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { motivoParaSaltar } from "./internal-session";

/**
 * Corrida de N personas por el camino normal: catálogo → validar preparación → ejecutar →
 * recargar y recuperar la corrida por `?runId=` → ver el progreso servido por el servidor.
 *
 * Requiere el stack REAL con la API de control QA (`/api/v1/systems/qa`, rama
 * `feat/qa-orchestration`), su worker y el mock de proveedores. Sin sesión se salta con su motivo;
 * con las corridas desactivadas en el entorno (PROD o `QA_EXECUTION_ENABLED` apagado), también.
 * Una preparación BLOQUEADA no se salta: es un fallo con sus motivos a la vista en la captura.
 */
test.describe("campaña de journeys QA", () => {
  test.skip(Boolean(motivoParaSaltar()), motivoParaSaltar());

  test("lanzar 2 personas desde el catálogo y recuperar la corrida tras recargar", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const health = new PageHealth(page);

    await page.goto("/internal/qa/lab?tab=journey");
    await settled(page);
    await expect(page.getByText("Recorridos precargados")).toBeVisible();

    const card = page.getByTestId("qa-template-account_signup_to_login");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await capture(page, testInfo, "1 catalogo precargado");

    const disabled = page.getByText(/Las corridas de QA están desactivadas/);
    test.skip(
      await disabled.isVisible(),
      "Las corridas de QA están desactivadas en este entorno (PROD o QA_EXECUTION_ENABLED apagado).",
    );

    await card.getByRole("button", { name: /^Ejecutar$/ }).click();
    const dialog = page.getByRole("dialog");
    const persons = dialog.getByRole("spinbutton", { name: /^Personas/ });
    await persons.fill("2");
    await dialog.getByRole("spinbutton", { name: /^Concurrencia/ }).fill("1");

    const execute = dialog.getByRole("button", {
      name: /^Ejecutar \d+ personas/,
    });
    await expect(execute).toBeDisabled();
    await dialog.getByRole("button", { name: /Validar preparación/ }).click();
    await expect(
      dialog
        .getByText("Preparación lista")
        .or(dialog.getByText("No se puede ejecutar todavía")),
    ).toBeVisible({ timeout: 30_000 });
    await capture(page, testInfo, "2 preparacion validada");
    await expect(dialog.getByText("Preparación lista")).toBeVisible();

    await expect(execute).toBeEnabled();
    await execute.click();
    await expect(page).toHaveURL(/[?&]runId=/, { timeout: 20_000 });

    // La corrida vive en el servidor: recargar no la interrumpe, sólo hay que volver a leerla.
    await page.reload();
    await settled(page);
    const progress = page.getByTestId("qa-run-progress");
    await expect(progress).toBeVisible({ timeout: 20_000 });
    await expect(progress.getByText(/Personas terminadas/)).toBeVisible();

    await expect(
      progress.getByText(
        /^Estado: (Terminada|Cancelada|Bloqueada|Falló la infraestructura|Se agotó el tiempo)$/,
      ),
    ).toBeVisible({
      timeout: 180_000,
    });
    // Terminada no es «pasó»: el veredicto va aparte y siempre se enseña.
    await expect(progress.getByText(/^Veredicto: /)).toBeVisible();
    await capture(page, testInfo, "3 corrida terminada");

    await health.expectHealthy();
  });

  test("el árbol ofrece ejecutar el flujo con N personas", async ({
    page,
  }, testInfo) => {
    await page.goto("/internal/qa/lab?tab=arbol");
    await settled(page);
    await expect(
      page.getByRole("button", { name: /Ejecutar flujo con N personas/ }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Probar este paso/)).toHaveCount(0);
    await capture(page, testInfo, "4 arbol con boton de corrida");
  });
});
