import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

/**
 * La navegación del catálogo de esquema, de punta a punta: versión → esquema de datos → tabla.
 *
 * Es el recorrido que estaba roto de dos maneras a la vez. El catálogo (`schema_tables`,
 * `schema_columns`, `schema_relationships`) estaba VACÍO sobre una base con 152 tablas, así que
 * abrir una versión decía «esta versión no tiene tablas registradas»; y el listado, aun con datos,
 * declaraba `columnsCount: 0` en todas las filas porque sólo el detalle de una tabla los calculaba.
 * Esta prueba falla si cualquiera de las dos cosas vuelve.
 */
test.describe("catálogo de esquema", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  test("de la versión al esquema y de ahí a una tabla", async ({
    page,
  }, testInfo) => {
    const health = new PageHealth(page);

    await page.goto("/internal/schema/versions");
    await settled(page);
    await capture(page, testInfo, "1 listado de versiones");

    // La versión activa debe declarar tablas: un catálogo en cero es el defecto original.
    const versionLink = page.getByRole("link", { name: /^v\d/ }).first();
    await expect(versionLink).toBeVisible();
    await versionLink.click();
    await settled(page);

    await expect(
      page.getByRole("heading", { level: 2, name: /esquemas de datos/i }),
    ).toBeVisible();
    await capture(page, testInfo, "2 version abierta con sus esquemas");

    const schemaCards = page.getByRole("button", { name: /tablas/i });
    expect(await schemaCards.count()).toBeGreaterThan(1);

    // Acotar por esquema es lo que hace navegable un inventario de 152 tablas con un techo de 100
    // filas por página: sin el filtro, «las tablas de identidad» no se podían pedir.
    const iam = page.getByRole("button", { name: /identidad y accesos/i });
    await iam.click();
    await settled(page);
    await expect(
      page.getByRole("heading", { level: 2, name: /tablas de\s+iam/i }),
    ).toBeVisible();
    await capture(page, testInfo, "3 esquema iam seleccionado");

    const firstTable = page
      .getByRole("link", { name: /auth_credentials|auth_/ })
      .first();
    await expect(firstTable).toBeVisible();
    await firstTable.click();
    await settled(page);

    await expect(
      page.getByRole("heading", { level: 2, name: /columnas/i }),
    ).toBeVisible();
    // Una tabla real tiene columnas. Cero aquí significa que el detalle volvió a mentir.
    const columnRows = page.locator("table tbody tr");
    expect(await columnRows.count()).toBeGreaterThan(0);
    await capture(page, testInfo, "4 tabla con columnas y relaciones");

    await health.expectHealthy();
  });
});
