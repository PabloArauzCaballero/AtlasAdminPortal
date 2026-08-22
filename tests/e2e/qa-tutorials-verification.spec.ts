import { expect, test, type Page } from "@playwright/test";

/**
 * Verificación E2E real de los tutoriales interactivos de QA LAB contra el
 * backend levantado (:3005) + DB seedeada. Comprueba en navegador de verdad lo
 * que jsdom no cubre: el Centro de aprendizaje bajo el shell autenticado, el
 * overlay de spotlight, el avance por pasos, la finalización y la PERSISTENCIA
 * del progreso en backend (tras recargar, el tutorial figura completado).
 *
 * Requiere el entorno E2E local (DB :5433 + backend :3005 + frontend :5273).
 * Credenciales por env var; el backend habilita CORS sólo para "localhost".
 */
const EMAIL = process.env.E2E_EMAIL ?? "pablo@atlas.internal";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const TENANT = process.env.E2E_TENANT ?? "1";
const APP = process.env.E2E_BASE_URL ?? "http://localhost:5273";
const url = (path: string): string => `${APP}${path}`;
const SHOTS = "test-results/qa-tutoriales";

async function login(page: Page): Promise<void> {
  await page.goto(url("/internal/login"));
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const tenant = page.locator('input[autocomplete="organization"]');
  await tenant.waitFor({ state: "visible" });
  await tenant.fill(TENANT);
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

/** Avanza el recorrido pulsando Siguiente hasta Finalizar. */
async function completeTutorial(page: Page): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    const finish = page.getByRole("button", { name: /Finalizar tutorial/i });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      return;
    }
    const next = page.getByRole("button", { name: /Siguiente paso/i });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
    } else {
      break;
    }
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Tutoriales QA LAB — verificación real en navegador", () => {
  test("Centro de aprendizaje carga con objetivos y tutoriales", async ({
    page,
  }) => {
    await login(page);
    const res = await page.goto(url("/internal/qa/aprender"), {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status(), "status del centro").toBeLessThan(500);
    await expect(
      page.getByRole("heading", { level: 1, name: "Centro de aprendizaje" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "¿Qué quieres hacer?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recorridos sugeridos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Primeros pasos en QA LAB" }),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOTS}-centro.png`, fullPage: true });
  });

  test("inicia, recorre y completa un tutorial; el progreso persiste", async ({
    page,
  }) => {
    await login(page);
    await page.goto(url("/internal/qa/aprender"), {
      waitUntil: "domcontentloaded",
    });

    // Inicia el recorrido "Primeros pasos en QA LAB" desde su ficha.
    const card = page
      .getByRole("article")
      .filter({ hasText: "Primeros pasos en QA LAB" });
    await card.getByRole("button", { name: /Iniciar tutorial/i }).click();

    // El overlay de spotlight aparece con el primer paso.
    await expect(page.getByTestId("tutorial-overlay")).toBeVisible();
    await expect(page.getByText("Bienvenido a QA LAB")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}-overlay.png` });

    await completeTutorial(page);
    await expect(page.getByText("¡Tutorial completado!")).toBeVisible();
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(page.getByTestId("tutorial-overlay")).toBeHidden();

    // Persistencia: tras recargar, la ficha figura "Completado" (viene de backend).
    await page.reload({ waitUntil: "domcontentloaded" });
    const reloaded = page
      .getByRole("article")
      .filter({ hasText: "Primeros pasos en QA LAB" });
    await expect(reloaded.getByText("Completado")).toBeVisible();
  });

  test("el botón Tutorial del lab abre el recorrido de la pestaña activa", async ({
    page,
  }) => {
    await login(page);
    await page.goto(url("/internal/qa/lab"), { waitUntil: "domcontentloaded" });

    await page
      .getByRole("button", { name: /Iniciar tutorial · Probar un endpoint/i })
      .click();
    await expect(page.getByTestId("tutorial-overlay")).toBeVisible();
    await expect(page.getByText("¿Qué es una prueba funcional?")).toBeVisible();
    // Se puede cerrar sin bloquear la plataforma.
    await page.getByRole("button", { name: "Cerrar tutorial" }).click();
    await expect(page.getByTestId("tutorial-overlay")).toBeHidden();
  });

  test("el Centro de aprendizaje aparece en el menú lateral de QA", async ({
    page,
  }) => {
    await login(page);
    await page.goto(url("/internal/qa/lab"), { waitUntil: "domcontentloaded" });
    await page
      .getByRole("link", { name: "Centro de aprendizaje" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/internal\/qa\/aprender$/);
  });
});
