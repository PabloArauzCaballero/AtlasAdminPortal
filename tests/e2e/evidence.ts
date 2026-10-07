import fs from "node:fs";
import path from "node:path";
import {
  expect,
  type Page,
  type TestInfo,
  type Request,
  type Locator,
} from "@playwright/test";

/**
 * Evidencia física de cada paso del E2E.
 *
 * Una suite que sólo dice «pasó» obliga a creerle. Aquí cada paso deja un PNG con nombre hablado en
 * `test-results/evidencia/`, y además se adjunta al informe de Playwright, de modo que revisar la
 * corrida es mirar la secuencia de pantallas y no leer una lista de aserciones verdes.
 *
 * Las capturas van fuera del control de versiones a propósito: son de una máquina y un momento
 * concretos, y un repositorio con noventa PNG por corrida deja de poder revisarse.
 */
export const EVIDENCE_DIR = "test-results/evidencia";

let counter = 0;

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function capture(
  page: Page,
  testInfo: TestInfo,
  step: string,
  options: { fullPage?: boolean } = {},
): Promise<string> {
  counter += 1;
  const dir = path.join(EVIDENCE_DIR, slug(testInfo.title));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(
    dir,
    `${String(counter).padStart(3, "0")}-${slug(step)}.png`,
  );
  await page.screenshot({ path: file, fullPage: options.fullPage ?? true });
  await testInfo.attach(step, { path: file, contentType: "image/png" });
  return file;
}

/**
 * Una pantalla del portal está SANA cuando no soltó errores de consola, ninguna petición devolvió
 * 4xx/5xx y no hay una tarjeta de error ni de acceso restringido pintada.
 *
 * Las tres condiciones son necesarias: el portal captura sus fallos de red y los pinta como una
 * tarjeta roja, así que sin mirar el DOM una vista completamente rota «pasa»; y al revés, hay
 * peticiones que fallan sin que la vista lo muestre.
 */
export class PageHealth {
  readonly consoleErrors: string[] = [];
  readonly failedRequests: string[] = [];
  /** Peticiones sin respuesta todavía: una que nunca contesta no aparece en `failedRequests`. */
  private readonly inFlight = new Map<Request, string>();

  constructor(private readonly page: Page) {
    const label = (request: Request): string =>
      `${request.method()} ${request.url().split("/api/v1")[1] ?? request.url()}`.slice(
        0,
        160,
      );
    page.on("request", (request) => this.inFlight.set(request, label(request)));
    page.on("requestfinished", (request) => this.inFlight.delete(request));
    page.on("requestfailed", (request) => this.inFlight.delete(request));
    page.on("console", (message) => {
      if (message.type() === "error") {
        const source = message.location().url;
        this.consoleErrors.push(
          `${message.text()}${source ? ` (${source})` : ""}`.slice(0, 300),
        );
      }
    });
    page.on("pageerror", (error) => {
      this.consoleErrors.push(`pageerror: ${String(error).slice(0, 300)}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        const url = response.url().split("/api/v1")[1] ?? response.url();
        this.failedRequests.push(`${response.status()} ${url}`);
      }
    });
  }

  /** Lo que un timeout esperando un elemento no dice: dónde está la página y qué sigue pendiente. */
  describe(): string {
    return [
      `url: ${this.page.url()}`,
      `peticiones sin respuesta: ${JSON.stringify([...this.inFlight.values()])}`,
      `errores de consola: ${JSON.stringify(this.consoleErrors)}`,
      `respuestas >= 400: ${JSON.stringify(this.failedRequests)}`,
    ].join("\n");
  }

  /** `toBeVisible` cuyo fallo trae el estado de la página en vez de sólo «element(s) not found». */
  async expectVisible(locator: Locator, what: string): Promise<void> {
    try {
      await expect(locator).toBeVisible();
    } catch (error) {
      throw new Error(`${what}\n${this.describe()}\n\n${String(error)}`);
    }
  }

  /** Ignora fallos esperados (p. ej. un 503 de Mongo cuando el perfil `logs` no está levantado). */
  ignoring(...patterns: RegExp[]): { console: string[]; requests: string[] } {
    const keep = (value: string) =>
      !patterns.some((pattern) => pattern.test(value));
    return {
      console: this.consoleErrors.filter(keep),
      requests: this.failedRequests.filter(keep),
    };
  }

  /**
   * Las imágenes que el navegador intentó pintar y no pudo.
   *
   * Una imagen rota no siempre deja rastro en la red ni en la consola: un blob con el tipo
   * equivocado, un archivo truncado o una respuesta 200 que no es una imagen se «cargan» bien y
   * en pantalla sólo queda el texto alternativo. Lo único que lo delata es que, ya terminada, no
   * tiene dimensiones. Se espera a que las pendientes terminen (con tope) antes de mirar; una
   * imagen diferida que sigue sin pedirse no está rota, está fuera de pantalla. Los SVG sin tamaño
   * propio pueden medir 0 legítimamente y se dejan fuera.
   */
  async brokenImages(): Promise<string[]> {
    return this.page.evaluate(async () => {
      const imagenes = Array.from(document.images).filter(
        (img) => img.currentSrc || img.src,
      );
      await Promise.all(
        imagenes.map((img) =>
          img.complete
            ? null
            : new Promise((resolve) => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
                setTimeout(resolve, 5_000);
              }),
        ),
      );
      const esSvg = (src: string) =>
        /\.svg(\?|#|$)|^data:image\/svg/i.test(src);
      return imagenes
        .filter(
          (img) =>
            img.complete &&
            img.naturalWidth === 0 &&
            !esSvg(img.currentSrc || img.src),
        )
        .map(
          (img) =>
            `${img.alt || "(sin alt)"} — ${(img.currentSrc || img.src).slice(0, 80)}`,
        );
    });
  }

  async expectHealthy(...ignore: RegExp[]): Promise<void> {
    const remaining = this.ignoring(...ignore);
    expect(remaining.requests, "peticiones fallidas").toEqual([]);
    expect(remaining.console, "errores de consola").toEqual([]);
    expect(
      await this.brokenImages(),
      "imágenes que no se pudieron pintar",
    ).toEqual([]);
    await expect(
      this.page.getByText("Acceso restringido", { exact: false }),
    ).toHaveCount(0);
    await expect(
      this.page.getByRole("heading", { name: /no se pudo|no se pudieron/i }),
    ).toHaveCount(0);
  }
}

/** Espera a que la vista termine de cargar: sin esqueletos y con el título pintado. */
export async function settled(page: Page): Promise<void> {
  await page
    .waitForLoadState("networkidle", { timeout: 20_000 })
    .catch(() => undefined);
  await expect(page.locator('[aria-label="Cargando"]')).toHaveCount(0, {
    timeout: 20_000,
  });
}

/** Qué URL cuenta como «llegó»: una expresión sobre la URL completa o un predicado. */
export type UrlExpected = RegExp | ((url: URL) => boolean);

function urlMatches(page: Page, expected: UrlExpected): boolean {
  const current = new URL(page.url());
  return typeof expected === "function"
    ? expected(current)
    : expected.test(current.href);
}

/**
 * Hace clic en algo que NAVEGA (un `next/link`, una fila, un botón que cambia la URL) y espera a que
 * la URL cumpla `expected`, reintentando el clic mientras no la cumpla.
 *
 * Un clic que cae antes de que React hidrate, o mientras la tabla se repinta, se pierde en silencio:
 * la URL no cambia y la prueba muere 30 s después esperando una ficha que nunca se pidió. Pasó en CI
 * con el catálogo de esquema, la ficha de auditoría y el login de mensajería, en ramas cuyo mismo
 * árbol había salido verde. Reintentar el clic cubre esa carrera; un enlace roto de verdad sigue
 * fallando aquí, con un error que dice qué no abrió, dónde se quedó la página y qué seguía en vuelo.
 *
 * Antes de cada reintento se mira si la URL YA cumple: una navegación lenta no recibe un segundo
 * clic. Aun así, no sirve para botones que además crean algo (lanzar una corrida, enviar un
 * formulario de alta): ahí un segundo clic es un segundo efecto.
 */
export async function clickAndNavigate(
  page: Page,
  locator: Locator,
  expected: UrlExpected,
  what: string,
  options: { health?: PageHealth; attemptMs?: number; timeout?: number } = {},
): Promise<void> {
  const health = options.health ?? new PageHealth(page);
  const attemptMs = options.attemptMs ?? 5_000;
  try {
    await expect(async () => {
      if (!urlMatches(page, expected)) {
        await locator.click({ timeout: attemptMs });
      }
      await expect(page).toHaveURL(expected, { timeout: attemptMs });
    }).toPass({ timeout: options.timeout ?? 45_000 });
  } catch (error) {
    throw new Error(`${what}\n${health.describe()}\n\n${String(error)}`);
  }
}
