import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

/**
 * El generador de datos de prueba sobre un endpoint que ANTES no tenía contrato.
 *
 * Sólo 5 de los 404 endpoints catalogados declaraban su contrato de entrada, así que el generador
 * no tenía de dónde derivar valores en 399 de ellos y había que escribir el payload a mano — que es
 * exactamente lo que hace que nadie pruebe el caso inválido. Ahora el catálogo se deriva del
 * contrato OpenAPI de cada bloque (y de los esquemas Zod, en el que no publica OpenAPI).
 *
 * `PATCH /customer-onboarding/{customerId}/profile` es uno de los que ganó contrato: no estaba en
 * las 18 semillas manuales y el escaneo de código nunca lo alcanzó dentro de un contenedor.
 */
test.describe("cobertura del generador de datos de prueba", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  test("genera casos sobre un endpoint catalogado desde el contrato", async ({
    page,
  }, testInfo) => {
    const health = new PageHealth(page);

    await page.goto("/internal/qa/lab");
    await settled(page);

    await page.getByPlaceholder(/endpointId/i).fill("1357");
    await page.getByRole("button", { name: /cargar endpoint/i }).click();
    await settled(page);

    // El contrato llegó del backend: el generador dice cuántos campos tiene.
    const badge = page.getByText(/campos en el contrato/i);
    await expect(badge).toBeVisible();
    await expect(badge).not.toContainText("0 campos");
    await capture(page, testInfo, "1 endpoint con contrato derivado");

    // Y produce un payload real, no las llaves vacías de antes.
    const payload = page.getByLabel("Payload de entrada");
    await expect(payload).not.toHaveValue("{}");
    await expect(payload).not.toContainText("string|optional");

    await page.getByLabel("Clase de caso").selectOption("invalid");
    await page.getByRole("button", { name: /generar \d+ casos?/i }).click();
    await expect(
      page.getByRole("group", { name: /casos generados/i }),
    ).toBeVisible();
    await capture(
      page,
      testInfo,
      "2 casos invalidos sobre el contrato derivado",
    );

    await health.expectHealthy();
  });
});
