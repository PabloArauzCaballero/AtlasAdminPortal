import { mkdirSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { tutorialCatalog } from "../../src/features/qa-tutorials/catalog";
import type { TutorialDefinition } from "../../src/features/qa-tutorials/types";
import { quietaParaCapturar } from "./estabilizar";
import { INTERNAL_STORAGE_STATE, motivoParaSaltar } from "./internal-session";

/**
 * Verificación E2E real de los tutoriales interactivos de QA LAB contra el
 * backend levantado (:53005 por defecto en `.env.local`) + DB seedeada.
 *
 * ## Qué demuestra
 *
 * Recorre LOS NUEVE tutoriales del catálogo desde el Centro de aprendizaje
 * haciendo SÓLO lo que la tarjeta dice —como un usuario que no sabe nada— hasta
 * «¡Tutorial completado!». En cada paso comprueba que el elemento explicado
 * está de verdad resaltado en pantalla (no el estado «no lo encuentro») y deja
 * una captura en `_evidencia-tutoriales-2026-09-15/<tutorial>/`.
 *
 * Además cubre los tres fallos que motivaron el arreglo del 2026-09-15:
 * - el recorrido sobrevive a la navegación y a un F5 (antes moría al cambiar
 *   de página porque el shell remonta todo con `key={pathname}`);
 * - una acción ya cumplida al entrar NO salta el paso, lo marca como hecho;
 * - el velo bloquea los clics detrás del tutorial.
 *
 * ## El segundo factor
 *
 * El proyecto setup ya entró con el PIN recibido por el buzón webhook. Esta suite
 * reutiliza ese estado de sesión para no repetir la autenticación en cada tutorial.
 */
const USER_ID = process.env.E2E_USER_ID ?? "1";
const EVIDENCIA =
  process.env.E2E_EVIDENCIA_DIR ?? "../_evidencia-tutoriales-2026-09-15";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

let page: Page;

test.beforeAll(async ({ browser }) => {
  test.skip(Boolean(motivoParaSaltar()), motivoParaSaltar());
  page = await openLoggedIn(browser);
});

test.afterAll(async () => {
  await page?.context().close();
});

for (const tutorial of tutorialCatalog) {
  test(`recorre «${tutorial.title}» de punta a punta`, async () => {
    await resetProgress(page, tutorial);
    await page.goto("/internal/qa/aprender", { waitUntil: "domcontentloaded" });
    const card = page.getByRole("article").filter({ hasText: tutorial.title });
    await card.getByRole("button", { name: /Iniciar tutorial/i }).click();
    await walkTutorial(page, tutorial);
    // Persistencia: tras recargar, la ficha figura «Completado».
    await page.goto("/internal/qa/aprender", { waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: tutorial.title })
        .getByText("Completado"),
    ).toBeVisible();
  });
}

test("el recorrido sobrevive a un F5 y al cambio de página", async () => {
  const tutorial = byId("qa-lab-overview");
  await resetProgress(page, tutorial);
  await page.goto("/internal/qa/aprender", { waitUntil: "domcontentloaded" });
  // Arranca desde el Centro (otra página que el Lab): antes moría aquí mismo.
  await page
    .getByRole("button", { name: "Entender la plataforma desde cero" })
    .click();
  await expect(page).toHaveURL(/\/internal\/qa\/lab/);
  await expect(dialog(page)).toContainText("Bienvenido a QA LAB");
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await expect(dialog(page)).toContainText("Tres formas de mirar una prueba");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(dialog(page)).toContainText("Tres formas de mirar una prueba");
  await page.getByRole("button", { name: "Cerrar tutorial" }).click();
});

test("una acción ya cumplida al entrar no salta el paso: lo marca hecho", async () => {
  const tutorial = byId("qa-lab-decision-tree");
  await resetProgress(page, tutorial);
  // Ya estamos en la pestaña que el paso 2 pide abrir.
  await page.goto("/internal/qa/lab?tab=arbol", {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[data-tutorial-id="workflow-canvas"]').waitFor();
  await page
    .getByRole("button", { name: /Iniciar tutorial · Leer el árbol/i })
    .click();
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await expect(dialog(page)).toContainText(
    "Abre la pestaña «Árbol de decisión»",
  );
  await expect(dialog(page)).toContainText("Esto ya está hecho");
  await expect(
    page.getByRole("button", { name: "Siguiente paso" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Cerrar tutorial" }).click();
});

test("el velo bloquea los clics detrás del tutorial", async () => {
  // El botón «Tutorial» del Lab abre el recorrido de la pestaña activa.
  const tutorial = byId("qa-lab-functional");
  await resetProgress(page, tutorial);
  await page.goto("/internal/qa/lab", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: /Iniciar tutorial · Probar un endpoint/i })
    .click();
  await expect(dialog(page)).toContainText("¿Qué es una prueba funcional?");
  // El primer paso abre su pestaña por URL; se espera a que asiente.
  await expect(page).toHaveURL(/tab=unitaria/);
  // Un clic donde está el enlace «Suites QA» del menú lateral, detrás del velo.
  const link = page.getByRole("link", { name: "Suites QA" });
  const box = await link.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  // Esperar la URL en vez de un reloj: `toHaveURL` reintenta sola hasta que la navegación ocurre,
  // y si no ocurre el fallo dice exactamente qué URL había en lugar de «700 ms no bastaron».
  await expect(page).toHaveURL(/\/internal\/qa\/lab$/);
  await expect(dialog(page)).toBeVisible();
  await page.getByRole("button", { name: "Cerrar tutorial" }).click();
});

// ---------------------------------------------------------------------------

function byId(id: string): TutorialDefinition {
  const found = tutorialCatalog.find((t) => t.id === id);
  if (!found) throw new Error(`Tutorial ${id} no está en el catálogo`);
  return found;
}

function dialog(p: Page) {
  return p.getByRole("dialog", { name: /^Tutorial/ });
}

/**
 * Recorre el tutorial activo haciendo lo que dice cada tarjeta. Cada paso con
 * target debe acabar RESALTADO (existe `tutorial-spot`); si la tarjeta dice
 * «No veo en pantalla», el tutorial no está haciendo el tour y la prueba falla
 * nombrando el paso.
 */
async function walkTutorial(p: Page, tutorial: TutorialDefinition) {
  const dir = `${EVIDENCIA}/${tutorial.id}`;
  mkdirSync(dir, { recursive: true });
  for (let index = 0; index < tutorial.steps.length; index += 1) {
    const step = tutorial.steps[index];
    const box = dialog(p);
    await expect(box, `${tutorial.id}/${step.id}: tarjeta visible`).toBeVisible(
      { timeout: 15_000 },
    );
    await expect(
      box,
      `${tutorial.id}/${step.id}: paso ${index + 1}`,
    ).toHaveAttribute("aria-label", new RegExp(`paso ${index + 1} de `));
    await expect(box).toContainText(step.title);

    const awaiting = await box
      .getByText(/^Tu turno:/)
      .isVisible()
      .catch(() => false);
    if (awaiting) {
      await performAction(p, tutorial.id, step.id);
      // La acción real hace avanzar el paso solo (o lo omitimos si no aplica).
      await expect
        .poll(
          async () =>
            (await box.getAttribute("aria-label"))?.includes(
              `paso ${index + 2} de `,
            ) ||
            (await box.getAttribute("aria-label"))?.startsWith(
              "Tutorial completado",
            ),
          {
            timeout: 15_000,
            message: `${tutorial.id}/${step.id}: avanza tras la acción`,
          },
        )
        .toBeTruthy();
      await captura(p, `${dir}/paso-${index + 1}-${step.id}.png`);
      continue;
    }

    if (step.target) {
      // Un paso OPCIONAL puede no tener nada que resaltar cuando faltan datos
      // (p. ej. una lista de ejecuciones vacía): entonces la tarjeta lo dice
      // con claridad y ofrece Siguiente. Los demás deben resaltar de verdad.
      const spot = p.getByTestId("tutorial-spot");
      if (step.optional) {
        await expect
          .poll(
            async () =>
              (await spot.isVisible().catch(() => false)) ||
              (await box
                .getByText("No veo en pantalla")
                .isVisible()
                .catch(() => false)),
            {
              timeout: 12_000,
              message: `${tutorial.id}/${step.id}: resaltado o aviso claro`,
            },
          )
          .toBeTruthy();
      } else {
        await expect(
          spot,
          `${tutorial.id}/${step.id}: el elemento «${step.target}» debe estar resaltado`,
        ).toBeVisible({ timeout: 12_000 });
        await expect(box).not.toContainText("No veo en pantalla");
      }
    }
    await captura(p, `${dir}/paso-${index + 1}-${step.id}.png`);

    const last = index === tutorial.steps.length - 1;
    await box
      .getByRole("button", {
        name: last ? "Finalizar tutorial" : "Siguiente paso",
      })
      .click();
  }
  const done = p.getByRole("dialog", { name: /^Tutorial completado/ });
  await expect(done).toBeVisible();
  await captura(p, `${dir}/completado.png`);
  await done.getByRole("button", { name: "Entendido" }).click();
  await expect(p.getByTestId("tutorial-overlay")).toBeHidden();
}

/** Captura con el scroll suave y las transiciones ya apagados, no «tras dejarlos asentar». */
async function captura(p: Page, path: string) {
  await quietaParaCapturar(p);
  await p.screenshot({ path });
}

/** Lo que haría el usuario leyendo «Tu turno», paso por paso. */
async function performAction(p: Page, tutorialId: string, stepId: string) {
  const key = `${tutorialId}/${stepId}`;
  switch (key) {
    case "qa-lab-functional/pick": {
      await p.getByPlaceholder(/Buscar ruta/).fill("health");
      await p
        .locator("table")
        .getByRole("button", { name: "Probar" })
        .first()
        .click();
      return;
    }
    case "qa-lab-functional/run": {
      await p.locator('[data-tutorial-id="qa-lab-run-functional"]').click();
      // La herramienta pide confirmar (dry-run): el usuario confirma.
      await p
        .getByRole("dialog")
        .filter({ hasText: "Confirmar" })
        .getByRole("button", { name: /^(Previsualizar|Ejecutar)$/ })
        .click();
      return;
    }
    case "qa-lab-stress/pick": {
      await p
        .locator("table")
        .getByRole("button", { name: "Probar" })
        .first()
        .click();
      return;
    }
    case "qa-lab-decision-tree/open": {
      await p.getByRole("button", { name: "Árbol de decisión" }).click();
      return;
    }
    case "qa-lab-decision-tree/legend-open": {
      await p.locator('[data-tutorial-id="workflow-legend-toggle"]').click();
      return;
    }
    case "qa-lab-decision-tree/select": {
      await p
        .locator('[data-tutorial-id="workflow-graph"] [role="button"]')
        .first()
        .click();
      return;
    }
    case "qa-suites-list/create": {
      await p.locator('[data-tutorial-id="qa-suites-new"]').click();
      return;
    }
    case "qa-suite-detail/open": {
      await p
        .locator(
          '[data-tutorial-id="qa-suites-table"] a[href*="/internal/qa/suites/"]',
        )
        .first()
        .click();
      return;
    }
    case "qa-runs-interpret/open": {
      const link = p
        .locator(
          '[data-tutorial-id="qa-runs-table"] a[href*="/internal/qa/runs/"]',
        )
        .first();
      if (await link.isVisible().catch(() => false)) await link.click();
      else await p.getByRole("button", { name: "Omitir este paso" }).click();
      return;
    }
    default:
      throw new Error(`Paso con acción sin guion en la prueba: ${key}`);
  }
}

/** Deja el tutorial en «no iniciado» en el backend y en la caché local. */
async function resetProgress(p: Page, tutorial: TutorialDefinition) {
  const response = await p.request.put("/api/qa-tutorials/progress", {
    data: {
      userId: USER_ID,
      progress: {
        tutorialId: tutorial.id,
        version: tutorial.version,
        status: "not-started",
        lastStepIndex: 0,
        percent: 0,
        timesStarted: 0,
      },
    },
  });
  expect(response.ok(), "reset de progreso").toBeTruthy();
  await p.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("qa-tutorials-progress:"))
        localStorage.removeItem(key);
    }
    sessionStorage.removeItem("qa-tutorials-active-run");
  });
}

async function openLoggedIn(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: INTERNAL_STORAGE_STATE,
  });
  const p = await context.newPage();
  await p.goto("/internal/qa/aprender");
  await expect(p).toHaveURL(/\/internal\/qa\/aprender/);
  return p;
}
