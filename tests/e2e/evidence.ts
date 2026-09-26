import fs from "node:fs";
import path from "node:path";
import { expect, type Page, type TestInfo, type Request, type Locator } from "@playwright/test";

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
      `${request.method()} ${request.url().split("/api/v1")[1] ?? request.url()}`.slice(0, 160);
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

  async expectHealthy(...ignore: RegExp[]): Promise<void> {
    const remaining = this.ignoring(...ignore);
    expect(remaining.requests, "peticiones fallidas").toEqual([]);
    expect(remaining.console, "errores de consola").toEqual([]);
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
