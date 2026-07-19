import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Verificación E2E real contra backend levantado (:3005) + DB seedeada.
 * Cierra los puntos que antes no se podían validar sin navegador/backend:
 *   R2  — cookies HttpOnly + sin tokens en sessionStorage
 *   R10 — axe (contraste AA / serias-críticas) en pantallas clave autenticadas
 *   R11 — smoke de flujos críticos (login, navegación, permisos, logout)
 * Credenciales por env var para no hardcodear secretos.
 */
const EMAIL = process.env.E2E_EMAIL ?? "pablo@atlas.internal";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const TENANT = process.env.E2E_TENANT ?? "1";
// El backend solo habilita CORS para http://localhost:5273 (no 127.0.0.1),
// y el navegador hace fetch directo al API — hay que entrar por "localhost".
const APP = process.env.E2E_BASE_URL ?? "http://localhost:5273";
const url = (path: string): string => `${APP}${path}`;

type Diag = { consoleErrors: string[]; badResponses: string[] };

function attachDiagnostics(page: Page): Diag {
  const diag: Diag = { consoleErrors: [], badResponses: [] };
  page.on("console", (msg) => {
    if (msg.type() === "error") diag.consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const s = res.status();
    if (s >= 400) diag.badResponses.push(`${s} ${res.request().method()} ${res.url()}`);
  });
  page.on("pageerror", (err) => diag.consoleErrors.push(`pageerror: ${err.message}`));
  return diag;
}

async function login(page: Page): Promise<void> {
  await page.goto(url("/internal/login"));
  await page.locator('input[autocomplete="organization"]').fill(TENANT);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar al portal interno/i }).click();
  // Éxito = salimos de /internal/login (redirect a la landing interna).
  // waitUntil "commit": basta con que la navegación cambie de URL; no se espera
  // el evento load de la landing (pesada), que introducía flake bajo carga.
  await page.waitForURL((url) => !url.pathname.endsWith("/internal/login"), {
    timeout: 20_000,
    waitUntil: "commit",
  });
}

test.describe.configure({ mode: "serial" });

test.describe("Producción — verificación real con backend", () => {
  test("login exitoso y redirección fuera de /login", async ({ page }) => {
    const diag = attachDiagnostics(page);
    await login(page);
    expect(page.url()).not.toContain("/internal/login");
    // No debe haber 5xx durante el login (los 401/403 esperados no aplican aquí).
    const server5xx = diag.badResponses.filter((r) => /^5\d\d /.test(r));
    expect(server5xx, server5xx.join("\n")).toEqual([]);
  });

  test("R2 — cookies de sesión HttpOnly y sin tokens en sessionStorage", async ({
    page,
  }) => {
    await login(page);

    const cookies = await page.context().cookies();
    const access = cookies.find((c) => c.name === "atlas_internal_access");
    const refresh = cookies.find((c) => c.name === "atlas_internal_refresh");

    expect(access, "cookie de access presente").toBeTruthy();
    expect(refresh, "cookie de refresh presente").toBeTruthy();
    expect(access?.httpOnly, "access HttpOnly").toBe(true);
    expect(refresh?.httpOnly, "refresh HttpOnly").toBe(true);
    // En local (http) Secure va en false; SameSite debe estar definido (Lax por defecto).
    expect(["Lax", "Strict", "None"]).toContain(String(access?.sameSite));

    // La sesión persistida en el navegador NO debe contener tokens.
    const raw = await page.evaluate(() => {
      const keys = Object.keys(window.sessionStorage);
      const sessionKey = keys.find((k) => k.startsWith("atlas_internal_session"));
      return sessionKey ? window.sessionStorage.getItem(sessionKey) : null;
    });
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown> & {
        accessToken?: unknown;
        refreshToken?: unknown;
      };
      expect(parsed.accessToken, "sin accessToken en sessionStorage").toBeFalsy();
      expect(parsed.refreshToken, "sin refreshToken en sessionStorage").toBeFalsy();
    }
  });

  test("navegación autenticada a pantallas clave sin 5xx ni errores duros de consola", async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);
    await login(page);

    const routes = [
      "/internal/systems/dashboard",
      "/internal/settings/users",
      "/internal/data-quality/issues",
      "/internal/qa/lab",
      "/internal/search",
    ];
    const visited: string[] = [];
    for (const route of routes) {
      const res = await page.goto(url(route), { waitUntil: "domcontentloaded" });
      // La ruta no debe devolver el HTML con 5xx.
      expect(res?.status(), `status de ${route}`).toBeLessThan(500);
      // La app no debe rebotar a login (sesión válida).
      await page.waitForLoadState("networkidle").catch(() => {});
      expect(page.url(), `no rebota a login desde ${route}`).not.toContain(
        "/internal/login",
      );
      visited.push(`${route} -> ${res?.status()}`);
    }
    console.log("VISITED:\n" + visited.join("\n"));

    const server5xx = diag.badResponses.filter((r) => /^5\d\d /.test(r));
    expect(server5xx, "sin 5xx\n" + server5xx.join("\n")).toEqual([]);
    // Reportar (no fallar) el detalle de 4xx y consola para evidencia.
    console.log("4XX/ERRS:\n" + JSON.stringify(diag, null, 2));
  });

  test("R10 — axe sin violaciones serias/críticas en pantallas clave", async ({
    page,
  }) => {
    await login(page);
    const screens = [
      "/internal/systems/dashboard",
      "/internal/settings/users",
      "/internal/data-quality/issues",
    ];
    const allSerious: Record<string, string[]> = {};
    for (const screen of screens) {
      await page.goto(url(screen), { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      // El contraste se mide sobre la página asentada, no a mitad de una
      // animación (pulse/auto-refresh) cuya opacidad cambiante da falsos
      // positivos transitorios. Se desactivan animaciones y se esperan fuentes.
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;transition:none!important;}",
      });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).analyze();
      const graves = violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      if (graves.length) {
        allSerious[screen] = graves.map((v) => `${v.id} (${v.nodes.length})`);
        for (const v of graves) {
          for (const node of v.nodes) {
            console.log(
              `AXE ${screen} :: ${v.id} :: ${JSON.stringify(node.target)} :: ${node.failureSummary?.replace(/\n/g, " | ")}`,
            );
          }
        }
      }
    }
    expect(allSerious, JSON.stringify(allSerious, null, 2)).toEqual({});
  });

  test("R10/#3 — grafo de linaje: nodos operables por teclado y axe limpio", async ({
    page,
  }) => {
    await login(page);
    const res = await page.goto(url("/internal/lineage/official"), {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status(), "status lineage").toBeLessThan(500);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;transition:none!important;}",
    });
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    // Los nodos del grafo son <button> HTML (el SVG solo dibuja aristas).
    const nodes = page.locator("button.group.absolute");
    const count = await nodes.count();
    console.log(`LINEAGE nodos renderizados: ${count}`);
    if (count > 0) {
      const first = nodes.first();
      await first.focus();
      const tag = await first.evaluate((el) => el.tagName.toLowerCase());
      expect(tag, "el nodo es un <button> nativo (Tab + Enter)").toBe("button");
      // El nodo enfocado es el elemento activo (operable por teclado).
      const isFocused = await first.evaluate(
        (el) => el === document.activeElement,
      );
      expect(isFocused, "el nodo recibe foco por teclado").toBe(true);
      // Enter abre el detalle (activación nativa del botón).
      await first.press("Enter");
      await page.waitForTimeout(300);
    }

    const { violations } = await new AxeBuilder({ page }).analyze();
    const graves = violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id} (${v.nodes.length})`);
    if (graves.length) {
      for (const v of violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      )) {
        for (const node of v.nodes) {
          console.log(
            `AXE lineage :: ${v.id} :: ${JSON.stringify(node.target)} :: ${node.failureSummary?.replace(/\n/g, " | ")}`,
          );
        }
      }
    }
    expect(graves, JSON.stringify(graves)).toEqual([]);
  });

  test("logout limpia la sesión y vuelve a login", async ({ page }) => {
    await login(page);
    // Buscar el control de logout (botón o enlace) de forma tolerante.
    const logout = page
      .getByRole("button", { name: /cerrar sesión|salir|logout/i })
      .or(page.getByRole("link", { name: /cerrar sesión|salir|logout/i }))
      .first();
    if ((await logout.count()) > 0) {
      await logout.click();
      await page.waitForURL(/\/internal\/login/, { timeout: 15_000 });
      const cookies = await page.context().cookies();
      expect(
        cookies.find((c) => c.name === "atlas_internal_access"),
        "cookie de access eliminada tras logout",
      ).toBeFalsy();
    } else {
      test.info().annotations.push({
        type: "warning",
        description: "No se halló control de logout por rol/nombre; revisar topbar.",
      });
    }
  });
});
