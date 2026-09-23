import { expect, test, type Page } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { motivoParaSaltar } from "./internal-session";
import { normalizeRolesPayload } from "../../src/features/internal-users/normalize";
import { generateTemporaryPassword } from "../../src/features/internal-users/temporary-password";
import { BuzonPin } from "./pin-inbox";

/**
 * Mensajería interna de punta a punta, con DOS personas reales.
 *
 * Un broadcast que sólo se comprueba desde la cuenta que lo envía no prueba nada: la lista de
 * «mensajes enviados» se llena igual aunque nadie los reciba. Aquí se da de alta un usuario interno
 * nuevo, se abre SU sesión en otro contexto de navegador, y se comprueba que el mensaje llega a su
 * bandeja.
 *
 * La contraseña del usuario nuevo la genera ESTA prueba y la manda por la misma llamada que hace
 * el formulario de alta (`POST /internal/auth/signup`, ver `createInternalUser` en
 * `src/features/internal-users/services.ts`). Hasta el 2026-09-17 se leía de la pantalla, porque
 * el portal la enseñaba una vez tras el alta; ya no la enseña —viaja por correo— y la prueba del
 * alta por pantalla comprueba justamente que no aparezca.
 *
 * Se crean usuarios por corrida, con el sello de tiempo en el correo: reutilizar uno fijo haría
 * que la segunda ejecución fallara con «ya existe», que es un fallo del test y no del portal.
 */

const STAMP = Date.now();
const NEW_USER_EMAIL = `qa.mensajeria.${STAMP}@atlas.test`;
const NEW_USER_NAME = `QA Mensajeria ${STAMP}`;
const FORM_USER_EMAIL = `qa.alta.${STAMP}@atlas.test`;
const FORM_USER_NAME = `QA Alta ${STAMP}`;
const TENANT = process.env.TEST_TENANT_ID ?? "1";

test.describe.configure({ mode: "serial" });

test.describe("mensajería interna entre usuarios", () => {
  test.skip(Boolean(motivoParaSaltar()), motivoParaSaltar());

  // La genera la prueba, no la lee de ninguna pantalla.
  const temporaryPassword = generateTemporaryPassword();
  const subject = `Prueba E2E ${STAMP}`;

  test("un administrador da de alta un usuario interno sin ver su contraseña", async ({
    page,
  }, testInfo) => {
    const health = new PageHealth(page);

    await page.goto("/internal/settings/users/new");
    await settled(page);

    await page.getByLabel("Correo institucional").fill(FORM_USER_EMAIL);
    await page.getByLabel("Nombre completo").fill(FORM_USER_NAME);
    await page.getByTestId("select-department").click();
    await page.getByTestId("select-department-option-SYSTEMS").click();
    await page
      .getByLabel(/^Motivo/i)
      .fill("Alta de cuenta para la prueba E2E de mensajería interna.");
    // Un rol cualquiera del catálogo: el alta exige al menos uno.
    await page.getByRole("checkbox").first().check();
    await capture(page, testInfo, "1 formulario de alta");

    await page.getByRole("button", { name: /crear usuario/i }).click();

    await expect(
      page.getByRole("heading", { name: /^usuario creado$/i }),
    ).toBeVisible({ timeout: 20_000 });
    // El aviso dice a qué correo se envió la contraseña y no la pinta en ningún sitio.
    await expect(
      page.getByText(FORM_USER_EMAIL, { exact: false }),
    ).toBeVisible();
    await expect(page.getByTestId("temporary-password")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /copiar/i })).toHaveCount(0);
    await capture(
      page,
      testInfo,
      "2 usuario creado, contraseña sólo por correo",
    );

    await health.expectHealthy();
  });

  test("el alta por la misma llamada que hace el formulario, con contraseña propia", async ({
    page,
  }) => {
    // `page.request` comparte las cookies de la sesión del administrador. Mismo cuerpo que
    // `createInternalUser`: si el contrato del alta cambia, esta prueba cae con él.
    const response = await page.request.post(signupUrl(page), {
      headers: {
        "content-type": "application/json",
        "x-atlas-product": "admin-portal",
        "x-tenant-id": TENANT,
        origin: new URL(page.url()).origin,
      },
      data: {
        email: NEW_USER_EMAIL,
        password: temporaryPassword,
        fullName: NEW_USER_NAME,
        department: "SYSTEMS",
        roles: [await firstRoleCode(page)],
        reason: "Alta de cuenta para la prueba E2E de mensajería interna.",
        mustChangePassword: true,
      },
      failOnStatusCode: false,
    });
    expect(
      response.status(),
      `el alta respondió ${response.status()}: ${await response.text()}`,
    ).toBeLessThan(300);
  });

  test("el usuario nuevo puede abrir su propia sesión", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await loginAs(page, NEW_USER_EMAIL, temporaryPassword);
    await expect(
      page.getByText(NEW_USER_NAME, { exact: false }).first(),
    ).toBeVisible();
    await capture(page, testInfo, "sesion del usuario nuevo");
    await context.close();
  });

  test("un broadcast del admin llega a la bandeja del usuario nuevo", async ({
    page,
    browser,
  }, testInfo) => {
    await page.goto("/internal/notifications");
    await settled(page);
    await page.getByRole("button", { name: /enviar notificaci[óo]n/i }).click();

    await page.getByTestId("select-audience").click();
    await page.getByTestId("select-audience-option-internal_users").click();
    await page.getByLabel(/t[íi]tulo|asunto/i).fill(subject);
    await page
      .getByLabel(/mensaje|cuerpo/i)
      .fill(`Mensaje de verificación automática ${STAMP}.`);
    await capture(page, testInfo, "1 broadcast configurado");

    await page
      .getByRole("button", { name: /enviar/i })
      .last()
      .click();
    // Diálogo de confirmación: enviar a todos los internos no es una acción silenciosa.
    const confirm = page.getByRole("button", { name: /^enviar$/i }).last();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();

    await expect(page.getByText(/enviad|encolad/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await capture(page, testInfo, "2 broadcast enviado");

    // Y ahora, desde la otra persona.
    const context = await browser.newContext({ storageState: undefined });
    const receiver = await context.newPage();
    await loginAs(receiver, NEW_USER_EMAIL, temporaryPassword);
    await receiver.goto("/internal/my-notifications");
    await settled(receiver);
    await expect(receiver.getByText(subject)).toBeVisible({ timeout: 20_000 });
    await capture(receiver, testInfo, "3 recibido por el usuario nuevo");
    await context.close();
  });
});

async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const buzon = new BuzonPin();
  await buzon.abrir();
  buzon.vaciar();
  try {
    await page.goto("/internal/login");
    const form = page.locator("form").last();
    const tenant = form.getByLabel("Tenant");
    await expect(tenant).toBeEditable();
    await tenant.clear();
    await tenant.fill(process.env.TEST_TENANT_ID ?? "1");
    await form.getByLabel("Correo interno").fill(email);
    await form.getByLabel("Contraseña").fill(password);
    await form
      .getByRole("button", { name: /entrar al portal interno/i })
      .click();
    const pinField = page.getByLabel("Código de verificación");
    await expect(pinField).toBeVisible({ timeout: 30_000 });
    await pinField.fill(await buzon.esperarPin(email));
    await page
      .getByRole("button", { name: /verificar|continuar|entrar/i })
      .click();
    await page.waitForURL(
      (url) =>
        url.pathname.startsWith("/internal") &&
        !url.pathname.startsWith("/internal/login"),
      { timeout: 30_000 },
    );
  } finally {
    await buzon.cerrar();
  }
  await settled(page);
}

/**
 * Dónde vive la API, igual que lo resuelve el portal: `NEXT_PUBLIC_API_BASE_URL` absoluta, o
 * relativa al origen del portal cuando se despliega detrás de su propio proxy.
 */
function signupUrl(page: Page): string {
  const base = (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3005/api/v1"
  ).replace(/\/+$/, "");
  const absolute = /^https?:\/\//i.test(base)
    ? base
    : `${new URL(page.url()).origin}${base}`;
  return `${absolute}/internal/auth/signup`;
}

/** Un rol cualquiera del catálogo, leído por la misma API y normalizado igual que en el portal. */
async function firstRoleCode(page: Page): Promise<string> {
  const response = await page.request.get(
    signupUrl(page).replace("/internal/auth/signup", "/internal/roles"),
    { headers: { "x-tenant-id": TENANT, "x-atlas-product": "admin-portal" } },
  );
  expect(response.ok(), "no se pudo leer el catálogo de roles").toBe(true);
  const payload = (await response.json()) as unknown;
  const unwrapped =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload;
  const code = normalizeRolesPayload(unwrapped).items[0]?.code;
  expect(code, "el catálogo de roles está vacío").toBeTruthy();
  return code as string;
}
