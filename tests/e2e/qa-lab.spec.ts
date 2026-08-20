import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

/**
 * El laboratorio de QA con un endpoint real, incluida la generación de datos de prueba.
 *
 * Cubre las tres cosas que se rehicieron: que elegir un endpoint COLAPSE el selector (antes la
 * tabla de 404 endpoints se quedaba encima de los formularios), que funcional y carga sean
 * pestañas y no dos murallas de campos simultáneas, y que el payload salga del generador en vez
 * de abrir con el contrato (`{"email":"string|required"}`) metido en la caja del payload.
 */
test.describe("laboratorio de QA", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  test("elegir endpoint, generar casos y previsualizar el request", async ({
    page,
  }, testInfo) => {
    const health = new PageHealth(page);

    // El endpoint 1 es `POST /auth/login`, uno de los pocos con contrato de campos publicado.
    await page.goto("/internal/qa/lab?endpointId=1");
    await settled(page);
    await capture(page, testInfo, "1 endpoint seleccionado");

    // El selector debe haber quedado colapsado en una barra.
    await expect(
      page.getByRole("button", { name: /cambiar endpoint/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /seleccionar endpoint/i }),
    ).toHaveCount(0);

    await expect(page.getByText(/campos en el contrato/i)).toBeVisible();

    const payload = page.getByLabel("Payload de entrada");
    // Abre con un caso generado, no con el contrato: `string|required` en la caja del payload
    // significaba enviar la DESCRIPCIÓN del campo como su valor.
    await expect(payload).not.toContainText("string|required");
    await expect(payload).toContainText("@atlas.test");

    // Clase inválida: debe faltar un campo obligatorio, que es lo que el endpoint tiene que
    // rechazar y lo que casi nadie probaba porque había que escribirlo a mano.
    await page.getByLabel("Clase de caso").selectOption("invalid");
    await page.getByRole("button", { name: /generar \d+ casos?/i }).click();
    await expect(
      page.getByRole("button", { name: /^Sin /i }).first(),
    ).toBeVisible();
    await capture(page, testInfo, "2 casos invalidos generados");
    await expect(payload).not.toContainText('"email"');

    // Vuelta a válidos y previsualización (dry-run, no ejecuta nada real).
    await page.getByLabel("Clase de caso").selectOption("valid");
    await page.getByRole("button", { name: /generar \d+ casos?/i }).click();
    await expect(payload).toContainText('"email"');

    await page.getByRole("button", { name: /previsualizar request/i }).click();
    await page.getByRole("button", { name: /^previsualizar$/i }).click();
    await expect(page.getByText("Resultado completo")).toBeVisible({
      timeout: 20_000,
    });
    // `dryRun: true` es la garantía de que la previsualización NO ejecutó nada real.
    await expect(page.getByText('"dryRun": true')).toBeVisible();
    await capture(page, testInfo, "3 dry-run ejecutado");

    // La pestaña de carga existe y es independiente de la funcional.
    await page.getByRole("button", { name: "Carga", exact: true }).click();
    await expect(page.getByText("Prueba de carga")).toBeVisible();
    await capture(page, testInfo, "4 pestaña de carga");

    await health.expectHealthy();
  });
});
