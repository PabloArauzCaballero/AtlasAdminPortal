import { expect, test, type Page } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

/**
 * Mensajería interna de punta a punta, con DOS personas reales.
 *
 * Un broadcast que sólo se comprueba desde la cuenta que lo envía no prueba nada: la lista de
 * «mensajes enviados» se llena igual aunque nadie los reciba. Aquí se da de alta un usuario interno
 * nuevo por el propio portal, se abre SU sesión en otro contexto de navegador, y se comprueba que
 * el mensaje llega a su bandeja. De paso queda probado el alta de usuarios, que entrega una
 * contraseña temporal que se muestra una sola vez.
 *
 * Se crea un usuario por corrida, con el sello de tiempo en el correo: reutilizar uno fijo haría
 * que la segunda ejecución fallara con «ya existe», que es un fallo del test y no del portal.
 */

const STAMP = Date.now();
const NEW_USER_EMAIL = `qa.mensajeria.${STAMP}@atlas.test`;
const NEW_USER_NAME = `QA Mensajeria ${STAMP}`;

test.describe.configure({ mode: "serial" });

test.describe("mensajería interna entre usuarios", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  let temporaryPassword = "";
  const subject = `Prueba E2E ${STAMP}`;

  test("un administrador da de alta un usuario interno", async ({
    page,
  }, testInfo) => {
    const health = new PageHealth(page);

    await page.goto("/internal/settings/users/new");
    await settled(page);

    await page.getByLabel("Correo institucional").fill(NEW_USER_EMAIL);
    await page.getByLabel("Nombre completo").fill(NEW_USER_NAME);
    await page.getByLabel("Departamento").selectOption("SYSTEMS");
    await page
      .getByLabel(/^Motivo/i)
      .fill("Alta de cuenta para la prueba E2E de mensajería interna.");
    // Un rol cualquiera del catálogo: el alta exige al menos uno.
    await page.getByRole("checkbox").first().check();
    await capture(page, testInfo, "1 formulario de alta");

    await page.getByRole("button", { name: /crear usuario/i }).click();

    const passwordBox = page.getByTestId("temporary-password");
    await expect(passwordBox).toBeVisible({ timeout: 20_000 });
    temporaryPassword = (await passwordBox.textContent())?.trim() ?? "";
    expect(temporaryPassword.length).toBeGreaterThan(10);
    await capture(page, testInfo, "2 usuario creado con clave temporal");

    await health.expectHealthy();
  });

  test("el usuario nuevo puede abrir su propia sesión", async ({
    browser,
  }, testInfo) => {
    expect(temporaryPassword, "el alta no entregó contraseña").not.toBe("");

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

    await page.getByLabel(/audiencia/i).selectOption("internal_users");
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
  await page.goto("/internal/login");
  const tenant = page.getByLabel("Tenant");
  await tenant.clear();
  await tenant.fill(process.env.TEST_TENANT_ID ?? "1");
  await page.getByLabel("Correo interno").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /entrar al portal interno/i }).click();
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/internal") &&
      !url.pathname.startsWith("/internal/login"),
    { timeout: 20_000 },
  );
  await settled(page);
}
