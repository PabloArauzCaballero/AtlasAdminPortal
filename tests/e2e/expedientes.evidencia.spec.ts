import { expect, test } from "@playwright/test";
import {
  DATOS,
  EXP_ID,
  arbol,
  abrirArchivo,
  abrirCarpeta,
  capturar,
  prepararBanco,
} from "../helpers/expediente-vps-harness";

/**
 * Evidencia visual del explorador de expedientes.
 *
 * ## Qué demuestra y por qué corre SIN login
 *
 * El resto de `tests/e2e` entra por la pantalla de acceso, y el portal interno exige un segundo
 * factor por correo que no se debe apagar ni sortear para una captura. Esta prueba no lo necesita:
 * sigue el mismo patrón que `investigacion-identidad.evidencia.spec.ts` —siembra la sesión en
 * `sessionStorage` y contesta las llamadas de datos desde la propia prueba—, así que ejercita el
 * CÓDIGO DE PANTALLA que está desplegado sin depender de credenciales.
 *
 * Lo que la hace evidencia del despliegue y no de un invento: los datos NO son inventados. Salen
 * del expediente real que el alta creó en el VPS y los bytes que se previsualizan son los MISMOS
 * que se subieron al almacén. El banco de pruebas vive en
 * `tests/helpers/expediente-vps-harness.ts`, compartido con la regresión del visor.
 *
 * Que el backend sirva todo eso ya se comprobó aparte, contra el túnel del VPS: el alta creó las
 * carpetas solas y los ficheros cayeron en su sitio (ver el informe de la carpeta de evidencia).
 */

test.describe("expedientes · evidencia visual con datos reales del VPS", () => {
  test.beforeEach(async ({ page }) => {
    await prepararBanco(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test("la lista de Archivos muestra el expediente del cliente", async ({
    page,
  }) => {
    await page.goto("/internal/files", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Archivos" })).toBeVisible();
    await expect(
      page.getByText(String(DATOS.expediente.customerCode)),
    ).toBeVisible();
    await capturar(page, "01-lista-de-expedientes.png");
  });

  test("el expediente abre con sus cuatro carpetas base", async ({ page }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    const nav = arbol(page);
    for (const carpeta of ["auth", "extractos", "domicilio", "otros"]) {
      await expect(nav.getByText(carpeta, { exact: true })).toBeVisible();
    }
    await capturar(page, "02-expediente-carpetas-base.png");
  });

  test("«auth» tiene el carnet y la selfie, marcados como subidos por el cliente", async ({
    page,
  }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "auth");
    const tabla = page.getByRole("table");
    await expect(tabla.getByRole("button", { name: /anverso/i })).toBeVisible();
    await expect(tabla.getByRole("button", { name: /reverso/i })).toBeVisible();
    await expect(tabla.getByRole("button", { name: /selfie/i })).toBeVisible();
    await expect(page.getByText("Lo subió el cliente").first()).toBeVisible();
    await capturar(page, "03-carpeta-auth.png");
  });

  test("«extractos» tiene el PDF del banco, separado de la identidad", async ({
    page,
  }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "extractos");
    await expect(
      page.getByRole("table").getByRole("button", { name: "extracto.pdf" }),
    ).toBeVisible();
    await capturar(page, "04-carpeta-extractos.png");
  });

  test("una imagen del carnet se abre dentro del portal, desde un blob", async ({
    page,
  }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "auth");
    await abrirArchivo(page, /anverso/i);
    const imagen = page.locator('img[src^="blob:"]');
    await expect(imagen).toBeVisible();
    // Que tenga ancho real prueba que el byte llegó y se decodificó, no que hay un hueco.
    expect(
      await imagen.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(100);
    await capturar(page, "05-vista-previa-carnet.png");
    await page.getByRole("button", { name: "Detalles" }).click();
    await expect(page.getByText("Huella (SHA-256)")).toBeVisible();
    await capturar(page, "06-detalles-y-huella.png");
  });

  test("el PDF del extracto se abre dentro del portal", async ({ page }) => {
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "extractos");
    await abrirArchivo(page, "extracto.pdf");
    await expect(page.locator('iframe[src^="blob:"]')).toBeVisible();
    await capturar(page, "07-vista-previa-extracto.png");
  });
});
