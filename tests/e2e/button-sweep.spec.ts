import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

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

test.describe("recorrido de controles", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

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
        await page.waitForTimeout(200);
        pressed.push(label.slice(0, 40));

        // Un diálogo abierto tapa el resto de la pantalla: se cierra antes de seguir.
        const cancel = page.getByRole("button", { name: /^cancelar$/i });
        if (await cancel.isVisible({ timeout: 500 }).catch(() => false)) {
          await cancel.click().catch(() => undefined);
        }
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
      expect(
        health.consoleErrors.filter(
          (entry) => !/logs\/mongo|503|429/.test(entry),
        ),
        "errores de consola tras pulsar controles",
      ).toEqual([]);
      expect(
        health.failedRequests.filter(
          (entry) => !/logs\/mongo|503|429/.test(entry),
        ),
        "peticiones fallidas tras pulsar controles",
      ).toEqual([]);
    });
  }
});
