import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { clickAndNavigate } from "./evidence";
import { motivoParaSaltar } from "./internal-session";

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
  test.skip(Boolean(motivoParaSaltar()), motivoParaSaltar());

  test("el catálogo de datos contiene los tres bloques y filtra por bloque", async ({
    catalogoDeDatos,
  }) => {
    await catalogoDeDatos.ir();
    await expect(catalogoDeDatos.titulo).toBeVisible();

    // El desplegable de bloque enumera los tres SIEMPRE: es lo que delata que un bloque no está
    // aportando nada, que es exactamente lo que antes no se podía ver.
    await catalogoDeDatos.filtroDeBloque.abrir();
    await expect(catalogoDeDatos.filtroDeBloque.opciones).toContainText(
      "ATLAS Backend",
    );
    await expect(catalogoDeDatos.filtroDeBloque.opciones).toContainText(
      "Decision Engine",
    );
    await expect(catalogoDeDatos.filtroDeBloque.opciones).toContainText(
      "ERP Backend",
    );
    await catalogoDeDatos.filtroDeBloque.cerrarSinElegir();

    // Sin filtro hay tablas de más de un bloque en el catálogo.
    await expect(catalogoDeDatos.tabla.elemento).toBeVisible();

    // Filtrar por el ERP debe dejar SÓLO filas del ERP. Se comprueba la insignia de bloque de cada
    // fila y no un conteo: un filtro que devuelve menos filas puede seguir estando mal.
    await catalogoDeDatos.filtroDeBloque.elegir("ERP_BACKEND");
    await expect(catalogoDeDatos.tabla.elemento).toBeVisible();
    await expect(catalogoDeDatos.tabla.celdasCon("ERP").first()).toBeVisible();
    await expect(
      catalogoDeDatos.tabla.celdasCon("Núcleo de Atlas"),
    ).toHaveCount(0);

    // Y el motor de decisión, que guarda todo en `public`, también aparece con lo suyo.
    await catalogoDeDatos.filtroDeBloque.elegir("DECISION_ENGINE");
    await expect(
      catalogoDeDatos.tabla.celdasCon("Motor de decisiones").first(),
    ).toBeVisible();
  });

  test("el inventario de endpoints contiene los tres bloques y filtra por bloque", async ({
    endpoints,
  }) => {
    await endpoints.ir();
    await expect(endpoints.titulo).toBeVisible();

    await endpoints.filtroDeBloque.abrir();
    await expect(endpoints.filtroDeBloque.opciones).toContainText(
      "ATLAS Backend",
    );
    await expect(endpoints.filtroDeBloque.opciones).toContainText(
      "Decision Engine",
    );
    await expect(endpoints.filtroDeBloque.opciones).toContainText(
      "ERP Backend",
    );
    await endpoints.filtroDeBloque.cerrarSinElegir();

    await endpoints.filtroDeBloque.elegir("DECISION_ENGINE");
    await expect(endpoints.tabla.elemento).toBeVisible();
    await expect(
      endpoints.tabla.celdasCon("Motor de decisiones").first(),
    ).toBeVisible();
    await expect(endpoints.tabla.celdasCon("ERP")).toHaveCount(0);
  });

  test("la pestaña Salud de la red reporta los tres bloques", async ({
    page,
  }) => {
    await page.goto("/internal/systems/network-health");
    await expect(
      page.getByRole("heading", { name: "Salud de la red" }),
    ).toBeVisible();

    // Una tabla con una fila por sistema: el estado vivo y cuánto aporta cada uno al catálogo
    // van en sus columnas. Que los contadores no sean cero es la prueba de que la federación corrió
    // de verdad y no sólo respondió 200.
    await expect(page.getByRole("table")).toBeVisible();
    for (const cabecera of [
      "Sistema",
      "Estado en vivo",
      "Operaciones",
      "Tablas",
    ]) {
      await expect(
        page.getByRole("columnheader", { name: cabecera }),
      ).toBeVisible();
    }
    for (const code of ["ATLAS_BACKEND", "DECISION_ENGINE", "ERP_BACKEND"]) {
      const fila = page
        .getByRole("row")
        .filter({ has: page.getByTestId(`network-block-${code}`) });
      await expect(fila).toBeVisible();
    }

    // La navegación tiene que llevar a la pestaña, no sólo la URL escrita a mano.
    // «Panel de control» se fusionó con Inicio: el menú se recorre desde ahí.
    await page.goto("/internal");
    await abrirGrupoDelMenu(page, "Sistemas");
    await clickAndNavigate(
      page,
      page.getByRole("link", { name: "Salud de la red" }),
      /\/internal\/systems\/network-health/,
      "la pestaña «Salud de la red» no abrió tras el clic",
    );
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

    // «Panel de control» se fusionó con Inicio: el menú se recorre desde ahí.
    await page.goto("/internal");
    // «Artefactos del motor» es pestaña de «Motor de decisiones» (Gobierno). La entrada lleva a
    // la primera pestaña que la sesión puede abrir; si ya es ésta, no hay nada más que pulsar.
    await abrirGrupoDelMenu(page, "Gobierno");
    await clickAndNavigate(
      page,
      page
        .getByRole("complementary", { name: "Navegación principal" })
        .getByRole("link", { name: "Motor de decisiones", exact: true }),
      /\/internal\/(settings\/decision-artifacts|systems\/decision-engine\/artifacts)/,
      "la entrada «Motor de decisiones» no abrió tras el clic",
    );
    if (!/decision-engine\/artifacts/.test(page.url())) {
      await clickAndNavigate(
        page,
        page
          .getByRole("navigation", { name: "Motor de decisiones" })
          .getByRole("link", { name: "Artefactos del motor" }),
        /\/internal\/systems\/decision-engine\/artifacts/,
        "la pestaña «Artefactos del motor» no abrió tras el clic",
      );
    }
  });
});

/**
 * Despliega un grupo del menú lateral como lo haría una persona.
 *
 * Antes la navegación se recorría desde «Panel de control» (`/internal/systems/dashboard`), que es
 * una pantalla de Systems Ops: el grupo salía ya abierto porque contenía la ruta activa. Con la
 * fusión de ese panel en Inicio, `/internal` no pertenece a ningún grupo y todos arrancan plegados
 * (`grid-rows-[0fr]`): el enlace existe en el DOM pero la cabecera del grupo siguiente le tapa el
 * clic. Se abre el grupo y se espera a que lo diga `aria-expanded`; el clic se reintenta por si cae
 * antes de que React hidrate.
 */
async function abrirGrupoDelMenu(page: Page, grupo: string): Promise<void> {
  const cabecera = page
    .getByRole("complementary", { name: "Navegación principal" })
    .getByRole("button", { name: grupo, exact: true });
  await expect(async () => {
    if ((await cabecera.getAttribute("aria-expanded")) !== "true") {
      await cabecera.click({ timeout: 5_000 });
    }
    await expect(cabecera).toHaveAttribute("aria-expanded", "true", {
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
}
