import { expect, test } from "@playwright/test";
import { clickAndNavigate } from "./evidence";
import { motivoParaSaltar } from "./internal-session";

/**
 * Verificación E2E real de la Guía del QA Lab (pestaña «Guía de referencia» de
 * /internal/qa/aprender; la ruta vieja /internal/qa/guia redirige) contra el
 * backend levantado (:3005) + DB seedeada. Comprueba en navegador de verdad lo
 * que jsdom no puede: render bajo el shell autenticado, scroll-spy con
 * IntersectionObserver, el SVG del gráfico animándose, y el portapapeles real.
 * Deja screenshots como evidencia para la beta.
 *
 * La sesión llega del proyecto `setup` (storageState compartido). Esta prueba tenía su propio
 * `login()` de un solo paso y se saltaba sin `E2E_PASSWORD`; pero todo acceso interno exige además
 * el PIN de segundo factor, así que ese login jamás habría salido de /internal/login y las seis
 * pruebas llevaban siempre saltadas —contando como «cubiertas» sin correr—.
 */
const SHOTS = "test-results/qa-guia";
const url = (path: string): string => path;

const SECTIONS = [
  "Un laboratorio, tres formas de probar",
  "Ambiente, permisos y el reflejo de la simulación",
  "Las cabeceras las gestiona el laboratorio por ti",
  "¿La operación responde lo que promete?",
  "¿Aguanta la carga — y a qué precio en latencia?",
  "Encadenar operaciones: la salida de una alimenta a la siguiente",
  "Por qué es difícil hacerte daño con esto",
  "Dónde quedan las corridas",
];

test.describe.configure({ mode: "serial" });

test.describe("Guía QA Lab — verificación real en navegador", () => {
  test.skip(Boolean(motivoParaSaltar()), motivoParaSaltar());

  test("carga autenticada y muestra las 8 secciones (screenshot)", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    const res = await page.goto(url("/internal/qa/aprender?tab=guia"), {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status(), "status de la guía").toBeLessThan(500);
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Aprender el laboratorio QA",
      }),
    ).toBeVisible();
    expect(page.url(), "no rebota a login").not.toContain("/internal/login");

    for (const title of SECTIONS) {
      await expect(
        page.getByRole("heading", { level: 2, name: title }),
      ).toBeVisible();
    }

    await page.screenshot({ path: `${SHOTS}-full.png`, fullPage: true });

    // Errores duros de consola (se ignoran los ruidos benignos conocidos).
    const hard = consoleErrors.filter(
      (e) => !/ResizeObserver|Download the React DevTools|hydrat/i.test(e),
    );
    expect(hard, hard.join("\n")).toEqual([]);
  });

  test("índice lateral navega por anclas (scroll-spy)", async ({ page }) => {
    await page.goto(url("/internal/qa/aprender?tab=guia"), {
      waitUntil: "domcontentloaded",
    });

    const nav = page.getByRole("navigation", { name: "Índice de la guía" });
    await expect(nav).toBeVisible();
    await clickAndNavigate(
      page,
      nav.getByRole("link", { name: /Recorrido encadenado/ }),
      /#journey$/,
      "el índice no llevó al ancla #journey tras el clic",
    );
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Encadenar operaciones: la salida de una alimenta a la siguiente",
      }),
    ).toBeInViewport();
  });

  test("la matriz de escenarios es una tabla que enseña cada cabecera", async ({
    page,
  }) => {
    await page.goto(url("/internal/qa/aprender?tab=guia"), {
      waitUntil: "domcontentloaded",
    });

    const row = page.getByRole("row").filter({ hasText: /Sin identificarse/ });
    await expect(
      row.getByText(/401 si la operación exige sesión\./),
    ).toBeVisible();
    await expect(row.getByText("ninguno")).toBeVisible();
  });

  test("el gráfico de stress avanza al simular la corrida (screenshot)", async ({
    page,
  }) => {
    await page.goto(url("/internal/qa/aprender?tab=guia"), {
      waitUntil: "domcontentloaded",
    });

    // Estado inicial: segundo 0.
    await expect(page.getByText("0 / 30")).toBeVisible();
    await page.getByRole("button", { name: /Simular corrida/ }).click();
    // La animación real recorre 30 segundos a ~120ms: se espera el final.
    await expect(page.getByText("30 / 30")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /Repetir corrida/ }),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOTS}-stress.png` });
  });

  test("copiar el journey escribe el array en el portapapeles", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(url("/internal/qa/aprender?tab=guia"), {
      waitUntil: "domcontentloaded",
    });

    // Las tablas de la guía también traen su botón «Copiar» (copia la tabla): se acota a la sección
    // del journey, que es la del botón que copia el array de pasos.
    const journey = page.locator("#journey");
    await journey.getByRole("button", { name: /^Copiar/ }).click();
    await expect(journey.getByText(/Copiado/)).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('"customerId": "data.customerId"');
    expect(clip).toContain("{{customerId}}");
  });

  // La guía es una pestaña de «Aprender el laboratorio QA», que es a su vez la pestaña «Aprender a
  // usarlo» de la entrada «Laboratorio QA» del menú: se llega desde la fila de pestañas del lab.
  test("el menú QA lleva del lab a la guía", async ({ page }) => {
    await page.goto(url("/internal/qa/lab"), { waitUntil: "domcontentloaded" });
    await clickAndNavigate(
      page,
      page
        .getByRole("navigation", { name: "Laboratorio QA" })
        .getByRole("link", { name: "Aprender a usarlo" }),
      /\/internal\/qa\/aprender$/,
      "«Aprender a usarlo» no abrió tras el clic en la fila de pestañas del lab",
    );
    await page.getByRole("button", { name: "Guía de referencia" }).click();
    await expect(page).toHaveURL(/\/internal\/qa\/aprender\?tab=guia$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Aprender el laboratorio QA",
      }),
    ).toBeVisible();
  });
});
