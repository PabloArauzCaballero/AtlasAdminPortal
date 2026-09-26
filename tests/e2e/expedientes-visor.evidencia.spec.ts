import { expect, test, type Page } from "@playwright/test";
import {
  EXP_ID,
  abrirArchivo,
  abrirCarpeta,
  capturar,
  prepararBanco,
} from "../helpers/expediente-vps-harness";

/**
 * Regresión del visor del expediente: los tres defectos que se reportaron sobre el detalle de un
 * archivo en el navegador de archivos del portal.
 *
 * 1. El PDF no se abría. La pantalla elegía bien el visor, pero el BLOB conservaba el tipo que
 *    dijo el almacén; con `application/octet-stream` un `<iframe>` se queda en `about:blank` —en
 *    blanco, sin un error en la consola ni en la pantalla—. Esa regla vive en `tipo-de-archivo.ts`
 *    y la cubren las pruebas unitarias: aquí no se puede medir, porque el Chromium sin cabeza no
 *    trae el visor de PDF y la política de contenido no deja leer un `blob:` con `fetch`.
 * 2. La imagen cargaba «a veces». La URL del blob se guardaba dentro de la respuesta cacheada y se
 *    revocaba al desmontar, así que la SEGUNDA vez que se abría el mismo archivo —cambiar de
 *    pestaña y volver, o cerrar el panel y reabrirlo— el `src` apuntaba a un objeto ya liberado.
 *    Es lo que se comprueba abajo, y lo que fallaba con `naturalWidth === 0`.
 * 3. El panel no bloqueaba el fondo: la barra lateral seguía nítida y la página de detrás se
 *    desplazaba con la rueda.
 *
 * Corre sin login, con el mismo banco de pruebas que la evidencia visual.
 */

async function abrirElAnverso(page: Page) {
  await page.goto(`/internal/files/${EXP_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await abrirCarpeta(page, "auth");
  await abrirArchivo(page, /anverso/i);
}

/** Que la imagen tenga ancho real prueba que el byte llegó y se decodificó, no que hay un hueco. */
async function anchoDeLaImagen(page: Page): Promise<number> {
  const imagen = page.locator('img[src^="blob:"]');
  await expect(imagen).toBeVisible();
  return imagen.evaluate((el: HTMLImageElement) => el.naturalWidth);
}

test.describe("visor del expediente", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test("el extracto se abre en un marco aunque el almacén lo rotule como octet-stream", async ({
    page,
  }) => {
    await prepararBanco(page, { contentType: "generico" });
    await page.goto(`/internal/files/${EXP_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await abrirCarpeta(page, "extractos");
    await abrirArchivo(page, "extracto.pdf");

    await expect(page.locator('iframe[src^="blob:"]')).toBeVisible();
    await expect(page.getByText(/no se puede previsualizar/i)).toBeHidden();
    await capturar(page, "10-pdf-con-tipo-generico.png");
  });

  test("la imagen se abre aunque el almacén la rotule como octet-stream", async ({
    page,
  }) => {
    await prepararBanco(page, { contentType: "generico" });
    await abrirElAnverso(page);
    expect(await anchoDeLaImagen(page)).toBeGreaterThan(100);
  });

  test("la imagen sigue ahí al volver a la pestaña de vista previa", async ({
    page,
  }) => {
    await prepararBanco(page);
    await abrirElAnverso(page);
    expect(await anchoDeLaImagen(page)).toBeGreaterThan(100);

    // Cambiar de pestaña desmonta el visor. Si el blob se revoca con la respuesta cacheada dentro,
    // al volver queda un `src` que ya no apunta a nada: la imagen aparece rota.
    await page.getByRole("button", { name: "Detalles" }).click();
    await expect(page.getByText("Huella (SHA-256)")).toBeVisible();
    await page.getByRole("button", { name: "Vista previa" }).click();

    expect(await anchoDeLaImagen(page)).toBeGreaterThan(100);
  });

  test("la imagen se abre otra vez tras cerrar el panel", async ({ page }) => {
    await prepararBanco(page);
    await abrirElAnverso(page);
    expect(await anchoDeLaImagen(page)).toBeGreaterThan(100);

    await page.getByRole("button", { name: "Cerrar panel" }).click();
    await abrirArchivo(page, /anverso/i);

    expect(await anchoDeLaImagen(page)).toBeGreaterThan(100);
  });

  test("con el panel abierto no se puede usar la barra de navegación", async ({
    page,
  }) => {
    await prepararBanco(page);
    await abrirElAnverso(page);
    await expect(page.getByRole("dialog")).toBeVisible();

    const estado = await page.evaluate(() => {
      // `#atlas-nav` es el `<aside>` de la barra lateral (rol `complementary`, no `navigation`).
      const barra = document.querySelector("#atlas-nav")!;
      const enlace = barra.querySelector("a[href]")!;
      const caja = enlace.getBoundingClientRect();
      const encima = document.elementFromPoint(
        caja.left + caja.width / 2,
        caja.top + caja.height / 2,
      );
      return {
        // Quién recibe de verdad el click en mitad de un enlace del menú.
        loRecibeElVelo: Boolean(encima?.closest("[data-atlas-overlay]")),
        barraInerte: barra.closest("[inert]") !== null,
        scrollDelFondo: getComputedStyle(document.body).overflow,
      };
    });

    expect(estado).toEqual({
      loRecibeElVelo: true,
      barraInerte: true,
      scrollDelFondo: "hidden",
    });
    await capturar(page, "11-panel-tapa-la-navegacion.png");
  });
});
