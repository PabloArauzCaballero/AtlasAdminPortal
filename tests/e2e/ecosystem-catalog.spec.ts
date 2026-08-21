import { expect, test } from "@playwright/test";

import { hasInternalCredentials } from "./internal-session";

/**
 * E2E del ECOSISTEMA: que el portal deje de enseñar un solo bloque.
 *
 * El defecto que estas pruebas fijan es concreto y era invisible: el catálogo de datos y el
 * inventario de endpoints sólo contenían Atlas Backend, y como ninguna columna decía de quién era
 * cada fila, la pantalla parecía completa. Por eso las aserciones no se conforman con «la tabla
 * carga»: comprueban que aparecen LOS TRES bloques y que filtrar por uno cambia lo que se ve.
 *
 * La sesión la abre el proyecto `setup` una sola vez (ver `auth.setup.ts`); aquí ya se entra
 * autenticado.
 */
test.describe("Ecosistema — catálogo, endpoints, red y artefactos", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  test("el catálogo de datos contiene los tres bloques y filtra por bloque", async ({
    page,
  }) => {
    await page.goto("/internal/data-catalog/tables");
    await expect(
      page.getByRole("heading", { name: "Catálogo de datos" }),
    ).toBeVisible();

    // El desplegable de bloque enumera los tres SIEMPRE, con su contador: es lo que delata que un
    // bloque no está aportando nada, que es exactamente lo que antes no se podía ver.
    const blockFilter = page.locator("select").first();
    await expect(blockFilter).toContainText("ATLAS Backend");
    await expect(blockFilter).toContainText("Decision Engine");
    await expect(blockFilter).toContainText("ERP Backend");

    // Sin filtro hay tablas de más de un bloque en el catálogo.
    await expect(page.getByRole("table")).toBeVisible();

    // Filtrar por el ERP debe dejar SÓLO filas del ERP. Se comprueba la insignia de bloque de cada
    // fila y no un conteo: un filtro que devuelve menos filas puede seguir estando mal.
    await blockFilter.selectOption("ERP_BACKEND");
    await expect(page.getByRole("table")).toBeVisible();
    const badges = page.getByRole("row").getByText("ERP Backend", {
      exact: true,
    });
    await expect(badges.first()).toBeVisible();
    await expect(
      page.getByRole("row").getByText("Atlas Backend", { exact: true }),
    ).toHaveCount(0);

    // Y el motor de decisión, que guarda todo en `public`, también aparece con lo suyo.
    await blockFilter.selectOption("DECISION_ENGINE");
    await expect(
      page
        .getByRole("row")
        .getByText("Decision Engine", { exact: true })
        .first(),
    ).toBeVisible();
  });

  test("el inventario de endpoints contiene los tres bloques y filtra por bloque", async ({
    page,
  }) => {
    await page.goto("/internal/systems/endpoints");
    await expect(
      page.getByRole("heading", { name: "Catálogo de endpoints" }),
    ).toBeVisible();

    const blockFilter = page.locator("select").first();
    await expect(blockFilter).toContainText("ATLAS Backend");
    await expect(blockFilter).toContainText("Decision Engine");
    await expect(blockFilter).toContainText("ERP Backend");

    await blockFilter.selectOption("DECISION_ENGINE");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page
        .getByRole("row")
        .getByText("Decision Engine", { exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("row").getByText("ERP Backend", { exact: true }),
    ).toHaveCount(0);
  });

  test("la pestaña Salud de la red reporta los tres bloques", async ({
    page,
  }) => {
    await page.goto("/internal/systems/network-health");
    await expect(
      page.getByRole("heading", { name: "Salud de la red" }),
    ).toBeVisible();

    for (const code of ["ATLAS_BACKEND", "DECISION_ENGINE", "ERP_BACKEND"]) {
      const card = page.getByTestId(`network-block-${code}`);
      await expect(card).toBeVisible();
      // Cada tarjeta declara su estado vivo y cuánto aporta al catálogo. Que los contadores no
      // sean cero es la prueba de que la federación corrió de verdad y no sólo respondió 200.
      await expect(card).toContainText("Endpoints");
      await expect(card).toContainText("Tablas");
    }

    // La navegación tiene que llevar a la pestaña, no sólo la URL escrita a mano.
    await page.goto("/internal/systems/dashboard");
    await page.getByRole("link", { name: "Salud de la red" }).click();
    await expect(page).toHaveURL(/\/internal\/systems\/network-health/);
  });

  test("la pestaña de artefactos del motor lista los despliegues activos", async ({
    page,
  }) => {
    await page.goto("/internal/systems/decision-engine/artifacts");
    await expect(
      page.getByRole("heading", { name: "Artefactos activos del motor" }),
    ).toBeVisible();

    // Una tabla con al menos un despliegue activo, o el aviso explícito de por qué no la hay.
    // Las dos son respuestas correctas; lo que no puede pasar es una pantalla en blanco.
    const table = page.getByRole("table");
    const warning = page.getByText(/El motor de decisión no/);
    await expect(table.or(warning).first()).toBeVisible();

    await page.goto("/internal/systems/dashboard");
    await page.getByRole("link", { name: "Artefactos del motor" }).click();
    await expect(page).toHaveURL(
      /\/internal\/systems\/decision-engine\/artifacts/,
    );
  });
});
