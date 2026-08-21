import type { Page } from "@playwright/test";

/**
 * Cómo entra la suite E2E al portal interno, en un solo sitio.
 *
 * Las credenciales llegan por entorno y nunca se versionan. Sin ellas las pruebas se saltan con un
 * motivo explícito: un fallo del E2E debe significar «el portal está mal», no «esta máquina no
 * tiene configuración».
 */
export const INTERNAL_STORAGE_STATE = "tests/e2e/.auth/internal.json";

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const TENANT = process.env.TEST_TENANT_ID ?? "1";

export function hasInternalCredentials(): boolean {
  return Boolean(EMAIL && PASSWORD);
}

export async function loginAsInternalUser(page: Page): Promise<void> {
  await page.goto("/internal/login");

  // `clear()` antes de escribir: el campo llega con el tenant por defecto ya puesto y `fill` sobre
  // un input controlado por react-hook-form lo CONCATENA en vez de reemplazarlo — el formulario se
  // enviaba con «11» y el backend contestaba, con razón, que ese tenant no existe.
  const tenant = page.getByLabel("Tenant");
  await tenant.clear();
  await tenant.fill(TENANT);
  await page.getByLabel("Correo interno").fill(EMAIL ?? "");
  await page.getByLabel("Contraseña").fill(PASSWORD ?? "");
  await page.getByRole("button", { name: /entrar al portal interno/i }).click();

  // Predicado y no expresión regular: tras el login el portal aterriza en `/internal` a secas, sin
  // barra final, y un patrón que exija `/internal/algo` da un timeout que se lee como «el login
  // falló» cuando en realidad funcionó.
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/internal") &&
      !url.pathname.startsWith("/internal/login"),
    { timeout: 20_000 },
  );
}
