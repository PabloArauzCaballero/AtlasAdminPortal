import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

test.describe("auditoría y RBAC", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  /**
   * `/internal/audit/request/:id` salía en blanco: el servicio declaraba devolver `ActionLog[]`
   * pero el backend contesta `{ data: { items } }` y nadie desenvolvía, así que la ficha de
   * cabecera no se pintaba nunca y la tabla arrancaba con un `data` que no es un array.
   */
  test("la ficha de auditoría por request muestra sus eventos", async ({
    page,
  }, testInfo) => {
    const health = new PageHealth(page);

    await page.goto("/internal/audit");
    await settled(page);
    await page.getByRole("button", { name: /auditor[íi]a sql/i }).click();
    await settled(page);
    await capture(page, testInfo, "1 auditoria sql");

    const requestLink = page
      .getByRole("link", { name: /^[0-9a-f-]{36}$/ })
      .first();
    await expect(requestLink).toBeVisible();
    const requestId = (await requestLink.textContent())?.trim() ?? "";
    await requestLink.click();
    await settled(page);

    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(requestId) }),
    ).toBeVisible();
    // La cabecera vive de `logs.data[0]`: con la respuesta mal leída no aparecía ninguna.
    await expect(page.getByText("Correlation ID")).toBeVisible();
    // Y la tabla debe traer al menos el evento del propio request.
    expect(await page.locator("table tbody tr").count()).toBeGreaterThan(0);
    await capture(page, testInfo, "2 ficha del request");

    await health.expectHealthy();
  });

  /**
   * La terminal de logs debe leerse como un log: nivel, contexto y mensaje separados, no el JSON
   * crudo dentro de un `<pre>`.
   */
  test("la terminal de logs formatea las líneas del backend", async ({
    page,
  }, testInfo) => {
    await page.goto("/internal/audit");
    await settled(page);

    const terminal = page.getByText(/archivo\.log/i).first();
    await expect(terminal).toBeVisible();
    await capture(page, testInfo, "terminal de logs");
  });

  /**
   * `InternalUsersService.replaceRoles` responde 403 cuando el objetivo es el propio actor. La
   * pantalla no lo reflejaba: dejaba desmarcar los roles propios y sólo fallaba al guardar, con las
   * casillas ya cambiadas — dando a entender que uno se había quedado sin permisos.
   */
  test("nadie puede quitarse roles a sí mismo", async ({ page }, testInfo) => {
    const health = new PageHealth(page);

    await page.goto("/internal/settings/profile");
    await settled(page);
    await page.goto("/internal/settings/users");
    await settled(page);

    // La propia cuenta es la del correo con el que se autenticó la suite. Se BUSCA en vez de
    // recorrer la primera página: el listado crece con cada alta —las pruebas de mensajería crean
    // una cuenta por corrida— y una fila que se sale de la página no es un defecto del portal.
    const email = process.env.TEST_EMAIL ?? "";
    await page.getByPlaceholder(/buscar usuario/i).fill(email);
    await settled(page);
    const selfRow = page.getByRole("row", { name: new RegExp(email, "i") });
    await expect(selfRow).toBeVisible();
    await selfRow.getByRole("link").first().click();
    await settled(page);

    await expect(
      page.getByText("Estás viendo tu propia cuenta."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /guardar roles/i }),
    ).toBeDisabled();
    for (const checkbox of await page
      .locator('fieldset input[type="checkbox"]')
      .all()) {
      await expect(checkbox).toBeDisabled();
    }
    await capture(page, testInfo, "roles propios bloqueados");

    await health.expectHealthy();
  });
});
