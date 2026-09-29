import type { WorkflowStep } from "./types";

/**
 * Un paso del flujo que hace una PERSONA (aprobar un asiento en el ERP, revisar un documento) no
 * llama a ninguna ruta: el catálogo lo trae con `httpMethod`, `routePath` y `endpointCode` en
 * `null`. Todo lo que pinta o ejecuta la ruta pasa por aquí para no tratar ese `null` como texto.
 */
export type RoutedWorkflowStep = WorkflowStep & {
  httpMethod: string;
  routePath: string;
};

export function isRoutedStep(step: WorkflowStep): step is RoutedWorkflowStep {
  return Boolean(step.httpMethod && step.routePath);
}

export const MANUAL_STEP_METHOD = "MANUAL";
export const MANUAL_STEP_ROUTE = "lo hace una persona";

export function stepEndpointLabel(step: WorkflowStep): string {
  return isRoutedStep(step)
    ? `${step.httpMethod} ${step.routePath}`
    : `${MANUAL_STEP_METHOD} · ${MANUAL_STEP_ROUTE}`;
}
