import { expect, test, type Page } from "@playwright/test";

/**
 * El asistente en el portal de operaciones: el botón aparece en una pantalla con sesión, el panel
 * abre con su historial y contesta.
 *
 * Corre sin login y sin backend, como el resto de `*.evidencia.spec.ts`: siembra la sesión en
 * `sessionStorage` y contesta las llamadas desde la propia prueba. Lo que se mide es el CÓDIGO DE
 * PANTALLA, no el stack.
 */
const SESION = {
  accessToken: "evidencia.sin.valor",
  tokenType: "Bearer",
  user: {
    id: "1",
    tenantId: "1",
    email: "operador@atlas.test",
    fullName: "Operador Interno",
    userCode: "OPS-1",
    status: "ACTIVE",
    mustChangePassword: false,
    mfaEnabled: true,
    roles: ["admin", "platform_admin", "internal_operator"],
    legacyRoles: [],
    permissions: [],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

const HILO = {
  conversationId: "c0ffee00-0000-4000-8000-000000000001",
  turns: [
    {
      turnId: "t1",
      prompt: "¿Dónde veo los préstamos?",
      reply: "En «Operaciones» › «Préstamos».",
      suggestHandoff: false,
      createdAt: "2026-09-27T10:00:00.000Z",
    },
  ],
};

async function preparar(page: Page): Promise<string[]> {
  const cuerpos: string[] = [];
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);

  // El comodín va primero: Playwright evalúa las rutas en orden inverso. Se aborta, como en las
  // demás evidencias: contestar `{}` a rutas que esperan listas hacía caer la pantalla de fondo.
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.route(
    (url) => url.pathname.endsWith("/internal/assist/conversation"),
    (route) => route.fulfill({ json: { data: HILO } }),
  );
  await page.route(
    (url) => url.pathname.endsWith("/internal/assist/chat"),
    (route) => {
      cuerpos.push(route.request().postData() ?? "");
      return route.fulfill({
        json: {
          data: {
            reply: "Abre «Cola de trabajo» y elige el caso.",
            suggestHandoff: false,
            conversationId: HILO.conversationId,
            turnId: "t2",
          },
        },
      });
    },
  );
  return cuerpos;
}

test("Asistente — el botón está y el panel responde", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const cuerpos = await preparar(page);
  await page.goto("/internal/operations/work-queue", {
    waitUntil: "domcontentloaded",
  });

  const boton = page.getByRole("button", { name: "Asistente de Atlas" });
  await expect(boton).toBeVisible();
  await boton.click();

  const panel = page.getByRole("dialog", { name: "Asistente de Atlas" });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText("No escribas contraseñas, códigos ni datos personales."),
  ).toBeVisible();
  await expect(
    panel.getByText("En «Operaciones» › «Préstamos»."),
  ).toBeVisible();

  await panel
    .getByRole("textbox", { name: "Tu pregunta para el asistente" })
    .fill("¿Qué hago aquí?");
  await page.keyboard.press("Enter");
  await expect(
    panel.getByText("Abre «Cola de trabajo» y elige el caso."),
  ).toBeVisible();

  const enviado = JSON.parse(cuerpos[0]) as Record<string, unknown>;
  expect(enviado).toMatchObject({
    surface: "admin-portal",
    prompt: "¿Qué hago aquí?",
    screen: "Operaciones › Cola de trabajo",
  });

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(boton).toBeFocused();
});

test("Asistente — en el teléfono el panel ocupa casi toda la pantalla", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await page.goto("/internal/support", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Asistente de Atlas" }).click();
  const panel = page.getByRole("dialog", { name: "Asistente de Atlas" });
  await expect(panel).toBeVisible();
  const caja = await panel.boundingBox();
  expect(caja?.width ?? 0).toBeGreaterThan(360);
  expect(caja?.height ?? 0).toBeGreaterThan(800);
});
