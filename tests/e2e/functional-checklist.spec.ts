import { expect, test, type Page } from "@playwright/test";

/**
 * Cubre la sección "Validación funcional con backend real" de
 * docs/release/production-readiness-checklist.md, que hasta ahora estaba sin
 * marcar porque exigía backend levantado + navegador.
 *
 * Requiere: AtlasBackend en :3005 con DB migrada y dos usuarios internos:
 *  - admin  (SUPER_ADMIN)            -> E2E_EMAIL / E2E_PASSWORD
 *  - acotado (RISK_ANALYST, 3 perms) -> E2E_LOW_EMAIL / E2E_LOW_PASSWORD
 */
const ADMIN_EMAIL = process.env.E2E_EMAIL ?? "pablo@atlas.internal";
const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? "";
const LOW_EMAIL = process.env.E2E_LOW_EMAIL ?? "risk.ops@atlas.test";
const LOW_PASSWORD = process.env.E2E_LOW_PASSWORD ?? "";
const TENANT = process.env.E2E_TENANT ?? "1";
// El backend habilita CORS para localhost:5273 (no 127.0.0.1) y el navegador
// llama al API directo, así que hay que entrar por "localhost".
const APP = process.env.E2E_BASE_URL ?? "http://localhost:5273";
const url = (path: string): string => `${APP}${path}`;

async function fillLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(url("/internal/login"));
  // El form es controlado por react-hook-form y "Tenant" viene con defaultValue.
  // Si se rellena antes de que React hidrate, el default se reaplica encima y el
  // valor queda duplicado ("11"), el backend recibe un tenant inexistente y
  // responde error interno. Por eso: esperar hidratación, re-llenar si hiciera
  // falta y afirmar el valor exacto antes de enviar.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const tenant = page.locator('input[autocomplete="organization"]');
  await tenant.waitFor({ state: "visible" });
  await tenant.fill(TENANT);
  if ((await tenant.inputValue()) !== TENANT) await tenant.fill(TENANT);
  await expect(tenant).toHaveValue(TENANT);

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /entrar al portal interno/i }).click();
}

async function login(
  page: Page,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<void> {
  await fillLogin(page, email, password);
  // El redirect post-login es client-side (router.replace), así que no emite
  // evento de navegación: se sondea la URL dentro de la página, que funciona
  // tanto para navegación soft como hard.
  await page.waitForFunction(
    () => !window.location.pathname.endsWith("/internal/login"),
    undefined,
    { timeout: 20_000 },
  );
}

test.describe.configure({ mode: "serial" });

test.describe("Checklist funcional con backend real", () => {
  test("login inválido muestra un error humano (y request ID si el backend lo da)", async ({
    page,
  }) => {
    // Cuenta inexistente a propósito: ejercita el error sin gastar intentos
    // fallidos de una cuenta real (el backend bloquea a los 5 por 15 min).
    await fillLogin(
      page,
      "no-existe.e2e@atlas.invalid",
      "password-incorrecta-a-proposito",
    );

    // Debe quedarse en login y explicar el fallo en lenguaje humano.
    await expect(page.getByText(/no se pudo iniciar sesión/i)).toBeVisible({
      timeout: 15_000,
    });
    expect(page.url()).toContain("/internal/login");

    // El texto del error no debe ser un volcado técnico crudo.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\[object Object\]|undefined|TypeError/);
  });

  test("la sesión se restaura desde la cookie tras recargar el navegador", async ({
    page,
  }) => {
    await login(page);
    const afterLogin = page.url();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Sigue autenticado: no rebota a login tras el reload.
    expect(page.url(), "no vuelve a login tras recargar").not.toContain(
      "/internal/login",
    );
    expect(new URL(page.url()).pathname).toBe(new URL(afterLogin).pathname);
  });

  test("sesión expirada redirige a login una sola vez (sin loop)", async ({
    page,
    context,
  }) => {
    await login(page);

    // Simula expiración: se borran las cookies de sesión emitidas por el API.
    await context.clearCookies();

    // El redirect a login puede abortar la navegación en curso (ERR_ABORTED):
    // es justo el comportamiento esperado, no un fallo.
    await page
      .goto(url("/internal/settings/users"), { waitUntil: "domcontentloaded" })
      .catch(() => undefined);
    await page.waitForFunction(
      () => window.location.pathname.endsWith("/internal/login"),
      undefined,
      { timeout: 20_000 },
    );

    // Y se queda ahí: sin bucle de redirecciones.
    const first = page.url();
    await page.waitForTimeout(2500);
    expect(page.url(), "no entra en loop de redirección").toBe(first);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("usuario sin permiso no ve la acción restringida en la UI", async ({
    page,
  }) => {
    await login(page, LOW_EMAIL, LOW_PASSWORD);

    // RISK_ANALYST no tiene internal.users.manage: la administración de
    // usuarios no debe ofrecerse como acción navegable en el shell.
    const adminUsersLink = page.getByRole("link", {
      name: /usuarios internos|gestión de usuarios/i,
    });
    expect(
      await adminUsersLink.count(),
      "no se ofrece administración de usuarios a un rol sin permiso",
    ).toBe(0);
  });

  test("usuario sin permiso recibe 403 controlado al entrar por URL directa", async ({
    page,
  }) => {
    await login(page, LOW_EMAIL, LOW_PASSWORD);

    const res = await page.goto(url("/internal/settings/users/new"), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    // No debe reventar ni quedar en blanco: estado controlado de acceso.
    expect(res?.status(), "la ruta responde HTML, no 5xx").toBeLessThan(500);
    await expect(
      page.getByText(/acceso restringido|no tienes permisos/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    // Y no se filtra el formulario de alta.
    await expect(
      page.getByRole("button", { name: /^crear usuario$/i }),
    ).toHaveCount(0);
  });

  test("la búsqueda global devuelve resultados con enlace navegable", async ({
    page,
  }) => {
    await login(page);
    await page.goto(url("/internal/search?q=a"), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Los resultados navegables son enlaces internos válidos.
    const links = page.locator('a[href^="/internal/"]');
    const count = await links.count();
    console.log(`SEARCH enlaces internos en resultados: ${count}`);
    expect(count, "hay al menos un enlace navegable").toBeGreaterThan(0);

    // Ningún href de resultado puede ser protocol-relative ni externo
    // (anti open-redirect: isSafeInternalPath).
    const hrefs = await links.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    for (const href of hrefs) {
      expect(href.startsWith("//"), `href protocol-relative: ${href}`).toBe(
        false,
      );
    }
  });

  test("release readiness se obtiene del backend, no se calcula en el navegador", async ({
    page,
  }) => {
    await login(page);

    const backendCalls: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("/api/v1/") && u.includes("release-readiness")) {
        backendCalls.push(`${req.method()} ${u}`);
      }
    });

    await page.goto(url("/internal/release-readiness"), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    console.log(
      `READINESS llamadas al backend: ${JSON.stringify(backendCalls)}`,
    );
    expect(
      backendCalls.length,
      "la pantalla pide el readiness al API interno",
    ).toBeGreaterThan(0);
  });

  test("el refresh token rota en cada uso y el anterior queda revocado", async ({
    page,
    context,
    request,
  }) => {
    await login(page);
    const first = (await context.cookies()).find(
      (c) => c.name === "atlas_internal_refresh",
    )?.value;
    expect(first, "hay refresh tras login").toBeTruthy();

    const refreshUrl = "http://localhost:3005/api/v1/internal/auth/refresh";
    const res1 = await request.post(refreshUrl, {
      headers: {
        "content-type": "application/json",
        origin: APP,
        cookie: `atlas_internal_refresh=${first}`,
      },
      data: {},
      failOnStatusCode: false,
    });
    expect(res1.status(), "el refresh vigente funciona").toBe(200);

    // La respuesta debe emitir un refresh NUEVO (rotación).
    const setCookie = res1.headers()["set-cookie"] ?? "";
    const rotated = /atlas_internal_refresh=([^;]+)/.exec(setCookie)?.[1];
    expect(rotated, "el refresh se re-emite").toBeTruthy();
    expect(rotated, "el refresh rotó (valor distinto)").not.toBe(first);

    // Y el anterior ya no sirve: rotación con revocación del previo.
    const res2 = await request.post(refreshUrl, {
      headers: {
        "content-type": "application/json",
        origin: APP,
        cookie: `atlas_internal_refresh=${first}`,
      },
      data: {},
      failOnStatusCode: false,
    });
    console.log(
      `ROTACION: refresh nuevo=${rotated !== first} | reuso del viejo -> HTTP ${res2.status()}`,
    );
    expect(res2.status(), "reusar el refresh viejo no puede dar 200").not.toBe(
      200,
    );
  });

  test("logout revoca la sesión en el servidor (el refresh viejo deja de servir)", async ({
    page,
    context,
    request,
  }) => {
    await login(page);

    const before = await context.cookies();
    const refresh = before.find((c) => c.name === "atlas_internal_refresh");
    expect(refresh, "hay cookie de refresh tras login").toBeTruthy();
    const refreshValue = refresh?.value ?? "";

    // Logout desde la UI.
    await page
      .getByRole("button", { name: /cerrar sesión/i })
      .first()
      .click();
    await page.waitForURL(/\/internal\/login/, { timeout: 20_000 });

    // El refresh token de antes ya no debe servir: revocado en servidor.
    const res = await request.post(
      "http://localhost:3005/api/v1/internal/auth/refresh",
      {
        headers: {
          "content-type": "application/json",
          origin: APP,
          cookie: `atlas_internal_refresh=${refreshValue}`,
        },
        data: {},
        failOnStatusCode: false,
      },
    );
    console.log(`REFRESH tras logout -> HTTP ${res.status()}`);
    expect(res.status(), "el refresh revocado no puede devolver 200").not.toBe(
      200,
    );
  });
});
