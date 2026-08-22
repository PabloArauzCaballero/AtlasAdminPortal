import { expect, test, type Page } from "@playwright/test";

/**
 * Verificación E2E real de la Guía del QA Lab (/internal/qa/guia) contra el
 * backend levantado (:3005) + DB seedeada. Comprueba en navegador de verdad lo
 * que jsdom no puede: render bajo el shell autenticado, scroll-spy con
 * IntersectionObserver, el SVG del gráfico animándose, y el portapapeles real.
 * Deja screenshots como evidencia para la beta.
 *
 * Credenciales por env var. El backend solo habilita CORS para localhost (no
 * 127.0.0.1), así que se navega con URLs absolutas a "localhost".
 */
const EMAIL = process.env.E2E_EMAIL ?? "pablo@atlas.internal";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const TENANT = process.env.E2E_TENANT ?? "1";
const APP = process.env.E2E_BASE_URL ?? "http://localhost:5273";
const url = (path: string): string => `${APP}${path}`;
const SHOTS = "test-results/qa-guia";

async function login(page: Page): Promise<void> {
  await page.goto(url("/internal/login"));
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const tenant = page.locator('input[autocomplete="organization"]');
  await tenant.waitFor({ state: "visible" });
  await tenant.fill(TENANT);
  if ((await tenant.inputValue()) !== TENANT) await tenant.fill(TENANT);
  await expect(tenant).toHaveValue(TENANT);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar al portal interno/i }).click();
  await page.waitForFunction(
    () => !window.location.pathname.endsWith("/internal/login"),
    undefined,
    { timeout: 20_000 },
  );
}

const SECTIONS = [
  "Un laboratorio, tres formas de probar",
  "Target, permisos y el reflejo del dry-run",
  "Los headers los gestiona el lab por ti",
  "¿El endpoint responde lo que promete?",
  "¿Aguanta la carga — y a qué precio en latencia?",
  "Encadenar endpoints: la salida de uno alimenta al siguiente",
  "Por qué es difícil hacerte daño con esto",
  "Dónde quedan las corridas",
];

test.describe.configure({ mode: "serial" });

test.describe("Guía QA Lab — verificación real en navegador", () => {
  test("carga autenticada y muestra las 8 secciones (screenshot)", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

    await login(page);
    const res = await page.goto(url("/internal/qa/guia"), {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status(), "status de la guía").toBeLessThan(500);
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Guía del Laboratorio de testing",
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
    await login(page);
    await page.goto(url("/internal/qa/guia"), {
      waitUntil: "domcontentloaded",
    });

    const nav = page.getByRole("navigation", { name: "Índice de la guía" });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: /Journey encadenado/ }).click();
    await expect(page).toHaveURL(/#journey$/);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Encadenar endpoints: la salida de uno alimenta al siguiente",
      }),
    ).toBeInViewport();
  });

  test("matriz de escenarios reacciona al click", async ({ page }) => {
    await login(page);
    await page.goto(url("/internal/qa/guia"), {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: /Sin autenticacion/ }).click();
    await expect(
      page.getByText(/401 si el endpoint requiere sesion\./),
    ).toBeVisible();
    await expect(page.getByText("Authorization: ninguno")).toBeVisible();
  });

  test("el gráfico de stress avanza al simular la corrida (screenshot)", async ({
    page,
  }) => {
    await login(page);
    await page.goto(url("/internal/qa/guia"), {
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
    await login(page);
    await page.goto(url("/internal/qa/guia"), {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: /^Copiar/ }).click();
    await expect(page.getByText(/Copiado/)).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('"customerId": "data.customerId"');
    expect(clip).toContain("{{customerId}}");
  });

  test("el botón Guía del lab lleva a la guía", async ({ page }) => {
    await login(page);
    await page.goto(url("/internal/qa/lab"), { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Guía" }).first().click();
    await expect(page).toHaveURL(/\/internal\/qa\/guia$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Guía del Laboratorio de testing",
      }),
    ).toBeVisible();
  });
});
