import { defaultDatasetMode } from "./run-launch-form";
import type {
  QaCapabilities,
  QaEnvironment,
  QaRunRequest,
  QaTemplateSummary,
} from "./types";

/**
 * «Generar y cargar» desde el árbol: el operador decide UNA cosa —cuántos usuarios ficticios— y el
 * resto sale de lo que el servidor ya sabe. Antes el lanzamiento pedía siete campos (plantilla,
 * entorno, concurrencia, datos, escenario, semilla y «Validar preparación») para una prueba cuyo
 * único parámetro con sentido para quien la lanza es el volumen.
 *
 * - Plantilla: la primera LISTA del flujo del árbol.
 * - Entorno: el primero que ofrece el servidor (sólo ofrece entornos aislados de QA).
 * - Concurrencia: todos los que el entorno admita a la vez, sin pasar de los pedidos. Es una prueba
 *   de CARGA: de uno en uno no carga nada.
 * - Semilla: nueva en cada lanzamiento, así cada prueba genera usuarios distintos.
 */
export type QuickLaunchPlan =
  | {
      ok: true;
      request: QaRunRequest;
      template: QaTemplateSummary;
      environment: QaEnvironment;
    }
  | { ok: false; problem: string };

export function planQuickLaunch(input: {
  workflowCode: string;
  persons: number;
  capabilities: QaCapabilities;
  templates: readonly QaTemplateSummary[];
  seed: string;
}): QuickLaunchPlan {
  const { capabilities, templates, persons } = input;
  if (!capabilities.enabled) {
    return {
      ok: false,
      problem:
        capabilities.disabledReason ??
        "Las pruebas con usuarios ficticios están apagadas en este entorno.",
    };
  }
  const environment = capabilities.environments[0];
  if (!environment) {
    return {
      ok: false,
      problem: "El servidor no ofrece ningún entorno aislado de QA.",
    };
  }
  const template = pickTemplate(templates, input.workflowCode);
  if (!template) {
    const blocked = templates.find(
      (item) =>
        item.workflowCode === input.workflowCode ||
        (item.matchedStepCodes?.length ?? 0) > 0,
    );
    return {
      ok: false,
      problem: blocked
        ? `El recorrido de este flujo no se puede ejecutar: ${blocked.blockedReasons.join("; ") || "está en borrador"}.`
        : "Ningún recorrido de prueba pasa por los pasos de este flujo.",
    };
  }
  if (!Number.isInteger(persons) || persons < 1) {
    return {
      ok: false,
      problem: "Indica cuántos usuarios ficticios (1 o más).",
    };
  }
  if (persons > environment.maxPersons) {
    return {
      ok: false,
      problem: `Este entorno admite hasta ${environment.maxPersons} usuarios por prueba.`,
    };
  }
  return {
    ok: true,
    template,
    environment,
    request: {
      workflowCode: input.workflowCode,
      templateCode: template.code,
      templateVersion: template.version,
      environmentId: environment.environmentId,
      mode: "INTEGRATED_QA",
      persons,
      concurrency: Math.max(1, Math.min(persons, environment.maxConcurrency)),
      seed: input.seed,
      datasetMode: defaultDatasetMode(template),
      scenarioCode: template.defaultScenario,
    },
  };
}

/**
 * La plantilla que recorre este flujo. El servidor ya filtra por flujo casando ENDPOINTS
 * (`matchedStepCodes`): una receta escrita para el ciclo completo del cliente pasa por los pasos
 * del recorrido de crédito aunque su `workflowCode` sea otro. Antes se exigía `workflowCode`
 * idéntico, y como sólo dos flujos tienen recetas propias, en todos los demás «Generar y cargar»
 * decía «todavía no tiene un recorrido de prueba publicado» con recetas listas que sí lo recorrían.
 *
 * Primero la escrita para este flujo; si no hay, la que más pasos suyos recorre.
 */
export function pickTemplate(
  templates: readonly QaTemplateSummary[],
  workflowCode: string,
): QaTemplateSummary | undefined {
  const ready = templates.filter((item) => item.status === "READY");
  const own = ready.find((item) => item.workflowCode === workflowCode);
  if (own) return own;
  return ready
    .filter((item) => (item.matchedStepCodes?.length ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.matchedStepCodes?.length ?? 0) - (a.matchedStepCodes?.length ?? 0),
    )[0];
}

export function newLoadSeed(now: Date = new Date()): string {
  return `carga-${now.toISOString().replace(/[-:.TZ]/g, "")}`;
}
