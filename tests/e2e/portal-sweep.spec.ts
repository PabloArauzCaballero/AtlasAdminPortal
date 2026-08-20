import { expect, test } from "@playwright/test";
import { capture, PageHealth, settled } from "./evidence";
import { hasInternalCredentials } from "./internal-session";

/**
 * Barrido de TODAS las vistas del portal, con captura de cada una.
 *
 * Es la prueba que faltaba: la suite anterior cubría el login y una vista suelta, así que una
 * pantalla podía quedar rota durante semanas sin que nada lo dijera —y varias lo estaban: cuatro
 * mostraban "Acceso restringido" a todo el mundo por filtrar con permisos que no existen en el
 * catálogo del backend, la ficha de auditoría por request salía en blanco por leer mal la respuesta
 * y cada ficha de reporte abría con un 404 contra un endpoint retirado—.
 *
 * Cada ruta se declara con lo que se espera ver, no sólo con su URL: un `200` que pinta la tarjeta
 * de error del portal no es una vista sana, y sin comprobar el encabezado la diferencia no existe.
 */

type Route = {
  path: string;
  heading: RegExp;
  /** Fallos aceptables y por qué. Vacío = ninguno. */
  ignore?: RegExp[];
};

const STATIC_ROUTES: Route[] = [
  { path: "/internal", heading: /centro interno/i },
  { path: "/internal/systems/dashboard", heading: /panel de control/i },
  { path: "/internal/systems/endpoints", heading: /endpoints/i },
  { path: "/internal/systems/tools", heading: /herramientas|tools/i },
  { path: "/internal/systems/tools/health", heading: /salud/i },
  { path: "/internal/systems/network-health", heading: /red|network/i },
  {
    path: "/internal/systems/decision-engine/artifacts",
    heading: /artefactos/i,
  },
  { path: "/internal/data-catalog/tables", heading: /cat[áa]logo|entidades/i },
  { path: "/internal/business-metadata/glossary", heading: /glosario/i },
  { path: "/internal/business-metadata/domains", heading: /dominios/i },
  { path: "/internal/business-metadata/definitions", heading: /definiciones/i },
  { path: "/internal/lineage", heading: /lineage/i },
  { path: "/internal/lineage/official", heading: /lineage oficial/i },
  { path: "/internal/lineage/impact", heading: /impacto/i },
  { path: "/internal/governance", heading: /gobierno/i },
  { path: "/internal/governance/pii", heading: /pii/i },
  { path: "/internal/governance/policies", heading: /pol[íi]ticas/i },
  { path: "/internal/data-quality/rules", heading: /reglas/i },
  { path: "/internal/data-quality/issues", heading: /incidencias|issues/i },
  { path: "/internal/reports", heading: /reporter[íi]a/i },
  { path: "/internal/reports/readiness", heading: /readiness|disponibilidad/i },
  { path: "/internal/release-readiness", heading: /release|disponibilidad/i },
  { path: "/internal/qa/lab", heading: /laboratorio/i },
  { path: "/internal/qa/suites", heading: /suites/i },
  { path: "/internal/qa/runs", heading: /runs qa/i },
  { path: "/internal/qa/stress", heading: /carga|stress/i },
  { path: "/internal/qa/stress/runs", heading: /carga|stress/i },
  { path: "/internal/review-queue", heading: /revisi[óo]n/i },
  { path: "/internal/operations/work-queue", heading: /cola de trabajo/i },
  { path: "/internal/operations/catalogs", heading: /cat[áa]logos/i },
  { path: "/internal/operations/runtime-jobs", heading: /jobs de runtime/i },
  { path: "/internal/jobs", heading: /jobs internos/i },
  { path: "/internal/alerts", heading: /alertas/i },
  { path: "/internal/notifications", heading: /notificaciones/i },
  { path: "/internal/my-notifications", heading: /mis notificaciones/i },
  { path: "/internal/exports", heading: /exportaciones/i },
  { path: "/internal/forms", heading: /formularios/i },
  { path: "/internal/schema/versions", heading: /versiones de esquema/i },
  { path: "/internal/schema/change-log", heading: /change log/i },
  { path: "/internal/risk-policy/current", heading: /pol[íi]tica de riesgo/i },
  { path: "/internal/external-providers", heading: /proveedores/i },
  { path: "/internal/external-providers/audits", heading: /auditor[íi]as/i },
  { path: "/internal/external-providers/requests", heading: /solicitudes/i },
  { path: "/internal/settings/users", heading: /usuarios/i },
  { path: "/internal/settings/roles", heading: /roles/i },
  { path: "/internal/settings/permissions", heading: /permisos/i },
  { path: "/internal/settings/profile", heading: /perfil/i },
  { path: "/internal/settings/catalog-sync", heading: /sincroniza/i },
  { path: "/internal/security/session", heading: /sesi[óo]n/i },
  { path: "/internal/search", heading: /b[úu]squeda global/i },
  {
    path: "/internal/audit",
    heading: /auditor[íi]a/i,
    /*
     * El visor de logs contesta 503 `MONGO_LOGS_NOT_CONFIGURED` cuando el stack se levantó sin el
     * perfil `logs`. Es una degradación declarada —la pantalla lo explica y ofrece cargar un
     * archivo a mano—, no un fallo del portal, así que no debe tumbar el barrido.
     */
    ignore: [/logs\/mongo/, /503/],
  },
];

test.describe("barrido de vistas del portal", () => {
  test.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  for (const route of STATIC_ROUTES) {
    test(`vista ${route.path}`, async ({ page }, testInfo) => {
      const health = new PageHealth(page);
      await page.goto(route.path);
      await settled(page);

      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await capture(page, testInfo, route.path);
      await health.expectHealthy(...(route.ignore ?? []));
    });
  }
});
