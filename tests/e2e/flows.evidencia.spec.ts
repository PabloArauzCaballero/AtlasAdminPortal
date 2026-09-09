import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { capture, PageHealth } from "./evidence";

/**
 * Flujos contra el stack REAL: API en `NEXT_PUBLIC_API_BASE_URL`, portal en `PW_PORT`, y el
 * catálogo cargado con `_plan-flow-intelligence-2026-09-09/tools/load.mjs`.
 *
 * Entra ejercitando los DOS pasos del acceso interno (contraseña + PIN por correo). El PIN se lee
 * de un buzón local en `PW_PIN_INBOX_PORT` (8790), al que la API entrega el correo cuando corre
 * con `docker-compose.pin-inbox.yml`. No se apaga `AUTH_LOGIN_PIN_ENABLED`.
 *
 * Va en el proyecto `evidencia` porque el `setup` compartido no sabe de PIN y este spec sí.
 */
const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";
const TENANT = process.env.TEST_TENANT_ID ?? "1";
const PIN_PORT = Number(process.env.PW_PIN_INBOX_PORT ?? 8790);
const PIN = /\b(\d{6})\b/;

class BuzonPin {
  private readonly correos: Array<{ to: string; body: string }> = [];
  private servidor: Server | null = null;
  async abrir(): Promise<void> {
    this.servidor = createServer((request, response) => {
      const trozos: Buffer[] = [];
      request.on("data", (trozo: Buffer) => trozos.push(trozo));
      request.on("end", () => {
        try {
          const cuerpo = JSON.parse(Buffer.concat(trozos).toString("utf8")) as {
            to?: string;
            body?: string;
          };
          this.correos.push({ to: cuerpo.to ?? "", body: cuerpo.body ?? "" });
        } catch {
          /* un cuerpo ilegible no es un PIN */
        }
        response
          .writeHead(200, { "content-type": "application/json" })
          .end('{"id":"buzon-flows"}');
      });
    });
    await new Promise<void>((ok) => this.servidor?.listen(PIN_PORT, ok));
  }
  async cerrar(): Promise<void> {
    await new Promise<void>((ok) =>
      this.servidor ? this.servidor.close(() => ok()) : ok(),
    );
  }
  async esperarPin(destinatario: string, ms = 60_000): Promise<string> {
    const limite = Date.now() + ms;
    while (Date.now() < limite) {
      const correo = this.correos.find(
        (c) =>
          c.to.toLowerCase() === destinatario.toLowerCase() && PIN.test(c.body),
      );
      const pin = correo?.body.match(PIN)?.[1];
      if (pin) return pin;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(
      `No llegó el PIN para ${destinatario} en ${ms} ms (¿API con docker-compose.pin-inbox.yml apuntando a :${PIN_PORT}?).`,
    );
  }
}

async function entrarConPin(page: Page, buzon: BuzonPin): Promise<void> {
  await page.goto("/internal/login");
  const tenant = page.getByLabel("Tenant");
  await tenant.clear();
  await tenant.fill(TENANT);
  await page.getByLabel("Correo interno").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /entrar al portal interno/i }).click();
  await expect(page.getByLabel("Código de verificación")).toBeVisible({
    timeout: 20_000,
  });
  await page
    .getByLabel("Código de verificación")
    .fill(await buzon.esperarPin(EMAIL));
  await page.getByRole("button", { name: /confirmar y entrar/i }).click();
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/internal") &&
      !url.pathname.startsWith("/internal/login"),
    { timeout: 20_000 },
  );
}

test.describe("Flujos (stack real)", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "Define TEST_EMAIL y TEST_PASSWORD para correr contra el stack real.",
  );

  test("tabla, tarjetas, filtro, ficha por enlace profundo y hallazgos", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const buzon = new BuzonPin();
    await buzon.abrir();
    const health = new PageHealth(page);
    try {
      await entrarConPin(page, buzon);
      await page.goto("/internal/flows");
      await expect(page.getByRole("heading", { name: "Flujos" })).toBeVisible();
      const tabla = page.getByRole("table").first();
      await expect(tabla).toBeVisible({ timeout: 30_000 });
      const filas = tabla.locator("tbody tr");
      expect(
        await filas.count(),
        "el catálogo de Flujos está vacío: carga el artefacto con tools/load.mjs",
      ).toBeGreaterThan(0);
      await capture(page, testInfo, "tabla de flujos con tarjetas");

      // La tarjeta «Críticos» aplica el filtro de riesgo.
      await page.getByRole("button", { name: /Críticos/ }).click();
      await expect(tabla.locator("tbody tr").first()).toContainText(
        "CRITICAL",
        { timeout: 20_000 },
      );
      await capture(page, testInfo, "filtro criticos desde la tarjeta");

      // La ficha se abre desde la ruta y queda en la URL (enlace profundo).
      await tabla
        .locator("tbody tr")
        .first()
        .getByRole("button")
        .first()
        .click();
      await expect(page).toHaveURL(/flow=flow_[a-f0-9]{12}/);
      const ficha = page.getByRole("dialog");
      await expect(
        ficha.getByText("Autorización", { exact: true }),
      ).toBeVisible();
      await expect(
        ficha.getByText("Quién la llama", { exact: true }),
      ).toBeVisible();
      await capture(page, testInfo, "ficha del flujo en el drawer");

      // Recargar el enlace profundo reabre la misma ficha.
      const enlace = page.url();
      await page.goto(enlace);
      // Con `next dev` la recarga compila la ruta de nuevo: el margen es mayor que el de la primera apertura.
      await expect(
        page.getByRole("dialog").getByText("Autorización", { exact: true }),
      ).toBeVisible({ timeout: 60_000 });
      await page.keyboard.press("Escape");

      await expect(
        page.getByRole("heading", { name: "Hallazgos" }),
      ).toBeVisible();
      await capture(page, testInfo, "hallazgos abiertos");

      // Grafo del módulo más grande (systems-ops: ~60 rutas) para medir layout y render.
      await page.goto(
        "/internal/flows/graph?systemCode=ATLAS_BACKEND&module=systems-ops",
      );
      const grafo = page.getByTestId("flow-graph");
      await expect(grafo).toBeVisible({ timeout: 60_000 });
      await expect
        .poll(async () => await grafo.getAttribute("data-render-ms"), {
          timeout: 30_000,
        })
        .not.toBe("");
      const medida = {
        nodes: Number(await grafo.getAttribute("data-nodes")),
        edges: Number(await grafo.getAttribute("data-edges")),
        layoutMs: Number(await grafo.getAttribute("data-layout-ms")),
        renderMs: Number(await grafo.getAttribute("data-render-ms")),
      };
      testInfo.annotations.push({
        type: "medida-grafo-modulo",
        description: JSON.stringify(medida),
      });
      console.info("MEDIDA_GRAFO", JSON.stringify(medida));
      expect(medida.nodes).toBeGreaterThan(100);
      // La cifra exacta se registra (anotación + consola) y el PLAN la discute; aquí sólo se exige que
      // el grafo siga siendo usable. Con `next dev` y ELK en el hilo principal, systems-ops (264 nodos)
      // ha medido entre 780 y 900 ms; en Node el mismo layout tarda ~110 ms.
      expect(
        medida.layoutMs,
        "el grafo dejó de ser usable: más de 3 s de layout",
      ).toBeLessThan(3_000);
      await page.waitForTimeout(800);
      await capture(page, testInfo, "grafo del modulo systems-ops", {
        fullPage: false,
      });

      // Buscar un nodo lo centra y resalta su camino.
      await page.getByLabel("Buscar nodo").fill("test-suites/:p/run");
      await page.waitForTimeout(600);
      await capture(
        page,
        testInfo,
        "grafo con nodo buscado y camino resaltado",
        { fullPage: false },
      );

      // Grafo de un solo flujo, abierto desde la ficha.
      await page.goto(
        "/internal/flows/graph?flow=" +
          new URL(enlace).searchParams.get("flow"),
      );
      await expect(page.getByTestId("flow-graph")).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.locator("[data-node-type='UNKNOWN']")).toHaveCount(1);
      await page.waitForTimeout(800);
      await capture(
        page,
        testInfo,
        "grafo de un flujo con el hueco sin resolver",
        { fullPage: false },
      );
    } finally {
      await buzon.cerrar();
    }
    expect(health.consoleErrors, health.consoleErrors.join("\n")).toEqual([]);
  });
});
