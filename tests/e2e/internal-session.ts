import { expect, type Page } from "@playwright/test";
import { clickAndNavigate } from "./evidence";
import { BuzonPin, HAY_BUZON } from "./pin-inbox";

/**
 * Cómo entra la suite E2E al portal interno, en un solo sitio.
 *
 * Las credenciales llegan por entorno y nunca se versionan. Sin ellas las pruebas se saltan con un
 * motivo explícito: un fallo del E2E debe significar «el portal está mal», no «esta máquina no
 * tiene configuración».
 *
 * **El acceso tiene DOS pasos y aquí se ejercitan los dos.** Tras la contraseña, todo actor interno
 * recibe un PIN de seis dígitos por correo — sin excepción de rol. Hasta el 2026-09-17 este ayudante
 * se quedaba en el primer paso y esperaba una navegación que nunca llegaba: el `storageState` no se
 * escribía nunca y las 136 pruebas de la suite dependían de él. En integración continua, además, no
 * había credenciales, así que 134 se SALTABAN y el workflow figuraba en verde. Las dos cosas juntas
 * hacían que la suite no cubriera absolutamente nada mientras aparentaba cubrirlo todo.
 */
export const INTERNAL_STORAGE_STATE = "tests/e2e/.auth/internal.json";

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const TENANT = process.env.TEST_TENANT_ID ?? "1";

export function hasInternalCredentials(): boolean {
  return Boolean(EMAIL && PASSWORD);
}

/** Qué falta para poder entrar, dicho en una frase. Vacío cuando no falta nada. */
export function motivoParaSaltar(): string {
  if (!hasInternalCredentials()) {
    return "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.";
  }
  if (!HAY_BUZON) {
    return (
      "Define PW_PIN_INBOX_PORT y arranca el backend con docker-compose.pin-inbox.yml: el acceso " +
      "interno exige un segundo factor por correo y la suite NO lo desactiva."
    );
  }
  return "";
}

/**
 * Entra con la cuenta de la suite o, si se pasan, con otras credenciales (p. ej. una cuenta recién
 * dada de alta por la propia prueba). Un solo camino de login: las copias locales se quedaban sin
 * las protecciones de aquí (hidratación, valor escrito, clic perdido).
 */
export async function loginAsInternalUser(
  page: Page,
  credentials: { email?: string; password?: string } = {},
): Promise<void> {
  const email = credentials.email ?? EMAIL ?? "";
  const password = credentials.password ?? PASSWORD ?? "";
  const buzon = new BuzonPin();
  await buzon.abrir();
  buzon.vaciar();

  try {
    await page.goto("/internal/login");

    // El formulario se rellena DESPUÉS de que React hidrate. Con la navegación resuelta en
    // `domcontentloaded`, la hidratación reemplaza los inputs y se lleva por delante lo escrito: el
    // envío salía con «Ingresa un correo válido» y se leía como contraseña incorrecta. La espera no
    // es un reloj: es una aserción sobre un elemento ya interactivo.
    // Next puede mantener brevemente el formulario SSR y el hidratado a la vez. Se usa el último
    // formulario para que los campos y el botón pertenezcan siempre a la misma instancia.
    const form = page.locator("form").last();
    const tenant = form.getByLabel("Organización");
    await expect(tenant).toBeEditable();

    // `clear()` antes de escribir: el campo llega con el tenant por defecto ya puesto y `fill` sobre
    // un input controlado por react-hook-form lo CONCATENA en vez de reemplazarlo — el formulario se
    // enviaba con «11» y el backend contestaba, con razón, que ese tenant no existe.
    await tenant.clear();
    await tenant.fill(TENANT);
    await form.getByLabel("Correo interno").fill(email);
    await form.getByLabel("Contraseña").fill(password);

    // Comprobar lo escrito antes de enviar convierte «la hidratación se comió el formulario» en un
    // error que se lee solo, en vez de un timeout tres pantallas más adelante.
    await expect(form.getByLabel("Correo interno")).toHaveValue(email);

    await form
      .getByRole("button", { name: /entrar al portal interno/i })
      .click();

    // Segundo paso: el código que acaba de salir por correo.
    const campoPin = page.getByLabel("Código de verificación");
    await expect(campoPin).toBeVisible({ timeout: 30_000 });
    await campoPin.fill(await buzon.esperarPin(email));

    // Predicado y no expresión regular: tras el login el portal aterriza en `/internal` a secas, sin
    // barra final, y un patrón que exija `/internal/algo` da un timeout que se lee como «el login
    // falló» cuando en realidad funcionó. Intentos de 10 s: verificar el PIN y cargar la portada
    // tarda más que un cambio de pestaña, y un segundo clic sobre un PIN ya aceptado sobra.
    await clickAndNavigate(
      page,
      page.getByRole("button", { name: /verificar|continuar|entrar/i }),
      (url) =>
        url.pathname.startsWith("/internal") &&
        !url.pathname.startsWith("/internal/login"),
      "el login no salió de /internal/login tras confirmar el PIN",
      { attemptMs: 10_000, timeout: 30_000 },
    );
  } finally {
    await buzon.cerrar();
  }
}
