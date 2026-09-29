import { expect, test, type Page } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { motivoParaSaltar } from "./internal-session";

/**
 * Pulsa TODOS los controles no destructivos de cada vista y comprueba que ninguno rompe la página.
 *
 * Una pestaña que no cambia de contenido, un desplegable que lanza una excepción al abrirse o un
 * filtro que dispara una petición que nadie atrapa no se ven en un barrido que sólo carga la
 * pantalla: hay que pulsar. Esto es lo que encuentra la clase de defecto que aparece al segundo
 * clic y no al primero.
 *
 * NO se pulsa lo que muta: ejecutar, enviar, aprobar, reconocer, federar, sembrar, recalcular…
 * Probar un botón no puede significar disparar el trabajo que ese botón dispara — un E2E que
 * federa el catálogo o manda un broadcast a toda la plataforma cada vez que corre es peor que no
 * tener E2E. Los flujos de mutación tienen sus propias pruebas, acotadas y con dry-run.
 */

/** Etiquetas que NO se pulsan: cada una desencadena trabajo real o irreversible. */
const DESTRUCTIVE =
  /ejecutar|enviar|aprobar|rechazar|reconocer|federar|descubrir|sembrar|refrescar cat|recalcular|procesar|reintentar|cerrar sesi|eliminar|borrar|desactivar|suspender|crear|guardar|proponer|resolver|marcar|activar|generar|previsualizar|descargar|copiar|cargar/i;

const ROUTES = [
  "/internal",
  "/internal/systems/dashboard",
  "/internal/systems/endpoints",
  "/internal/systems/tools",
  "/internal/systems/network-health",
  "/internal/data-catalog/tables",
  "/internal/business-metadata/glossary",
  "/internal/lineage",
  "/internal/lineage/official",
  "/internal/governance",
  "/internal/governance/policies",
  "/internal/data-quality/rules",
  "/internal/data-quality/issues",
  "/internal/reports",
  "/internal/release-readiness",
  "/internal/qa/lab",
  "/internal/qa/suites",
  "/internal/qa/runs",
  "/internal/qa/stress",
  "/internal/review-queue",
  "/internal/operations/work-queue",
  "/internal/operations/catalogs",
  "/internal/jobs",
  "/internal/alerts",
  "/internal/notifications",
  "/internal/my-notifications",
  "/internal/exports",
  "/internal/schema/versions",
  "/internal/schema/change-log",
  "/internal/external-providers",
  "/internal/settings/users",
  "/internal/settings/roles",
  "/internal/settings/permissions",
  "/internal/security/session",
  "/internal/audit",
];

/**
 * Tope de controles por vista. Algunas tablas traen un botón por fila y pulsar doscientos no añade
 * cobertura sobre pulsar treinta: son el mismo control repetido con otro identificador. Cuántos se
 * dejaron sin pulsar se ANOTA en el informe — un recorte silencioso se lee como cobertura completa.
 */
const MAX_CONTROLS = 30;

/** Ruido que NO es una avería del portal (ver el comentario junto a la comprobación). */
// `consoleErrors` trae la URL completa (…/api/v1/internal/assist/…) y `failedRequests` sólo la ruta
// ("404 /internal/assist/…"): el patrón cubre las dos formas.
const ERRORES_ESPERADOS = /logs\/mongo|503|429|404[^\n]*\/internal\/assist\//;

/**
 * Cierra el diálogo que un control haya abierto. Primero Escape (el patrón de todos los modales
 * del portal), después el botón de cierre del propio diálogo. Se comprueba que se cerró: si un
 * diálogo no se puede cerrar, es un defecto que la prueba debe enseñar, no esquivar.
 */
async function cerrarDialogosAbiertos(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog").last();
  if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) return;
  await page.keyboard.press("Escape").catch(() => undefined);
  if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) return;
  const cierre = dialog
    .getByRole("button", { name: /^(cerrar|cancelar|close)\b/i })
    .first();
  if (await cierre.isVisible({ timeout: 500 }).catch(() => false)) {
    await cierre.click({ timeout: 3_000 }).catch(() => undefined);
  }
  await expect(
    dialog,
    "un diálogo abierto por un control no se pudo cerrar con Escape ni con su botón",
  ).toBeHidden({ timeout: 3_000 });
}

test.describe("recorrido de controles", () => {
  test.skip(Boolean(motivoParaSaltar()), motivoParaSaltar());

  // Pulsar de uno en uno con su espera es lento por naturaleza; el timeout por defecto de 30 s
  // hacía fallar por reloj a las vistas con más controles, que son justo las que más cubren.
  test.setTimeout(90_000);

  for (const route of ROUTES) {
    test(`controles de ${route}`, async ({ page }, testInfo) => {
      const health = new PageHealth(page);
      await page.goto(route);
      await settled(page);

      const buttons = await page.getByRole("button").all();
      const pressed: string[] = [];
      const skipped = Math.max(0, buttons.length - MAX_CONTROLS);

      for (const button of buttons.slice(0, MAX_CONTROLS)) {
        // Todo va con `catch` y con plazo CORTO: pulsar una pestaña vuelve a montar el árbol y deja
        // sin nodo a los botones localizados antes. Sondear un locator caducado con el plazo por
        // defecto costaba treinta segundos por botón y agotaba el reloj de la prueba; un nodo que
        // ya no existe se sabe al instante, no en medio minuto.
        const label = (
          (await button.textContent({ timeout: 1_000 }).catch(() => "")) ?? ""
        ).trim();
        if (!label || DESTRUCTIVE.test(label)) continue;
        if (!(await button.isVisible({ timeout: 1_000 }).catch(() => false)))
          continue;
        if (!(await button.isEnabled({ timeout: 1_000 }).catch(() => false)))
          continue;

        await button.click({ timeout: 3_000 }).catch(() => undefined);
        // Tras pulsar, esperar a que la página deje de pedir en vez de contar 200 ms: un botón que
        // dispara una consulta lenta se medía antes de que respondiera.
        await page
          .waitForLoadState("networkidle", { timeout: 5_000 })
          .catch(() => undefined);
        pressed.push(label.slice(0, 40));

        // Un diálogo abierto tapa el resto de la pantalla (el fondo queda `inert`): se cierra antes
        // de seguir. Antes sólo se buscaba «Cancelar»; el 2026-09-28 el asistente (#52) puso en
        // TODAS las vistas un botón que abre un diálogo cuyo cierre es «Cerrar asistente», y el
        // barrido se quedó pulsando contra un fondo inerte: cada clic agotaba su plazo, cada ruta
        // el suyo, y el fragmento 1 superó los 45 min del job sin un solo mensaje. Ahora se cierra
        // cualquier diálogo abierto, por Escape y, si sigue, por su propio botón de cierre.
        await cerrarDialogosAbiertos(page);
      }

      testInfo.annotations.push({
        type: "controles pulsados",
        description:
          `${pressed.length}: ${pressed.join(" · ")}` +
          (skipped
            ? ` · ${skipped} sin pulsar por el tope de ${MAX_CONTROLS}`
            : ""),
      });
      await capture(page, testInfo, `${route} tras pulsar`);

      // Lo que se comprueba: ningún control dejó la página rota.
      // Lo que se descuenta, y por qué, uno por uno: `logs/mongo` (el MongoDB de logs está borrado),
      // 503/429 (el stack de CI se satura y se limita solo). Y el 404 de `/internal/assist/`:
      // es el contrato documentado de AtlasBackend con `ASSIST_ENABLED` apagada («ASSIST_DISABLED,
      // el portal esconde el botón»), no una avería; el stack de CI no tiene asistente. Un 404 de
      // cualquier OTRA ruta sigue siendo rojo.
      expect(
        health.consoleErrors.filter((entry) => !ERRORES_ESPERADOS.test(entry)),
        "errores de consola tras pulsar controles",
      ).toEqual([]);
      expect(
        health.failedRequests.filter((entry) => !ERRORES_ESPERADOS.test(entry)),
        "peticiones fallidas tras pulsar controles",
      ).toEqual([]);
    });
  }
});
