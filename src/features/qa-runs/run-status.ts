import { isAtlasApiError } from "@/shared/api/errors";
import type { Option } from "@/shared/lib/options";
import type {
  QaDatasetMode,
  QaRunStatus,
  QaRunSummary,
  QaVerdict,
} from "./types";

/** Estados en los que la corrida ya no cambia: el sondeo se detiene aquí. */
export const TERMINAL_STATUSES: ReadonlySet<QaRunStatus> = new Set([
  "COMPLETED",
  "CANCELLED",
  "BLOCKED",
  "FAILED_INFRASTRUCTURE",
  "TIMED_OUT",
]);

export function isTerminalStatus(status: QaRunStatus | undefined | null) {
  return Boolean(status && TERMINAL_STATUSES.has(status));
}

/** Cada 2 s mientras responde; ante errores, 2 → 4 → 8 → 10 s (tope). */
export const POLL_BASE_MS = 2_000;
export const POLL_MAX_MS = 10_000;

export function pollInterval(
  status: QaRunStatus | undefined,
  consecutiveErrors: number,
): number | false {
  if (isTerminalStatus(status)) return false;
  if (consecutiveErrors <= 0) return POLL_BASE_MS;
  return Math.min(POLL_BASE_MS * 2 ** consecutiveErrors, POLL_MAX_MS);
}

export const STATUS_LABEL: Record<QaRunStatus, string> = {
  QUEUED: "En cola",
  PREFLIGHT: "Preparando",
  RUNNING: "En curso",
  CANCELLING: "Cancelando…",
  COMPLETED: "Terminada",
  CANCELLED: "Cancelada",
  BLOCKED: "Bloqueada",
  FAILED_INFRASTRUCTURE: "Falló la infraestructura",
  TIMED_OUT: "Se agotó el tiempo",
};

/**
 * El veredicto va APARTE del estado: «Terminada» dice que el trabajo acabó, no que pasó. Una
 * corrida terminada con la mitad de las personas en rojo es COMPLETED con veredicto FAILED.
 */
export function verdictView(verdict: QaVerdict, status: QaRunStatus) {
  if (verdict === "PASSED") return { label: "Pasó", tone: "success" as const };
  if (verdict === "FAILED")
    return { label: "Falló", tone: "critical" as const };
  if (verdict === "INCONCLUSIVE")
    return { label: "Sin conclusión", tone: "warning" as const };
  return isTerminalStatus(status)
    ? { label: "Sin veredicto", tone: "muted" as const }
    : { label: "Aún sin veredicto", tone: "info" as const };
}

/**
 * `passRate` es la fracción 0..1 de pasos aprobados sobre pasos evaluados (`run-accounting.ts` del
 * backend). `null` es «sin muestras», nunca 0 % ni 100 %: sobre cero pasos no hay tasa que dar.
 */
export function formatPassRate(passRate: number | null | undefined): string {
  if (passRate === null || passRate === undefined || Number.isNaN(passRate))
    return "sin muestras";
  return `${Math.round(passRate * 1000) / 10} %`;
}

/** Personas que ya no van a cambiar de estado. */
export function finishedPersons(counters: QaRunSummary["counters"]): number {
  return (
    counters.personsPassed +
    counters.personsFailed +
    counters.personsBlocked +
    counters.personsIndeterminate +
    counters.personsCancelled
  );
}

export const DATASET_OPTIONS: Record<QaDatasetMode, Option> = {
  NORMAL_SYNTHETIC: {
    value: "NORMAL_SYNTHETIC",
    label: "Normales",
    description:
      "Personas sintéticas válidas: el recorrido debería terminar bien.",
  },
  INVALID: {
    value: "INVALID",
    label: "Inválidos",
    description:
      "Datos que el sistema tiene que rechazar: prueba los mensajes de error.",
  },
  BOUNDARY: {
    value: "BOUNDARY",
    label: "Fronteras",
    description:
      "Valores en el límite de lo permitido: edades, montos y largos extremos.",
  },
  OUTCOMES: {
    value: "OUTCOMES",
    label: "Desenlaces",
    description:
      "Perfiles elegidos para recorrer cada desenlace posible del flujo.",
  },
  MIXED: {
    value: "MIXED",
    label: "Mixtos",
    description:
      "Reparte las personas entre normales, inválidas y de frontera.",
  },
};

export const ACTOR_LABEL: Record<string, string> = {
  anonymous: "anónimo",
  customer: "cliente",
  internal_user: "personal interno",
  merchant_user: "comercio",
};

/** Qué hacer ante cada bloqueo de la preparación: el mensaje del servidor dice el qué. */
export const BLOCKER_HINT: Record<string, string> = {
  ENDPOINT_UNRESOLVED: "Un paso apunta a una ruta que el catálogo no conoce.",
  CONTRACT_MISMATCH: "El contrato publicado cambió respecto a la receta.",
  ACTOR_UNAVAILABLE: "Falta la cuenta con la que actúa uno de los pasos.",
  FIXTURE_MISSING: "Falta un dato de base que el recorrido necesita.",
  WORKER_UNAVAILABLE:
    "El ejecutor de corridas no está activo; espera o avisa a operaciones.",
  MOCK_UNAVAILABLE: "El simulador de proveedores externos no responde.",
  PLATFORM_SERVICE_UNAVAILABLE: "Un servicio interno del que depende el recorrido (el Motor de decisiones) no responde.",
  SCENARIO_UNSUPPORTED: "Elige otro escenario: éste no aplica a la plantilla.",
  UNSAFE_ENVIRONMENT: "Este entorno no admite corridas de QA.",
  BUDGET_EXCEEDED: "Baja personas o concurrencia para entrar en los límites.",
  BINDING_UNRESOLVED: "Un paso usa un dato que ningún paso anterior produce.",
  GRAPH_INVALID: "Los pasos de la receta no forman un recorrido válido.",
  TEMPLATE_NOT_READY: "La plantilla aún no está lista para ejecutarse.",
  INVALID_INPUT: "Revisa los valores del formulario.",
};

/** Mensaje y requestId de un error, sin volcar nada que no sea el mensaje del servidor. */
export function describeError(error: unknown): {
  message: string;
  requestId?: string;
  code?: string;
} {
  if (isAtlasApiError(error))
    return {
      message: error.message,
      requestId: error.requestId,
      code: error.code,
    };
  if (error instanceof Error) return { message: error.message };
  return { message: "Ocurrió un error inesperado." };
}

/** Las props de `ErrorState` para un error: el mensaje del servidor y su requestId. */
export function errorProps(error: unknown): {
  description: string;
  requestId?: string;
} {
  const { message, requestId } = describeError(error);
  return { description: message, requestId };
}

/** «Recorre 9 pasos de este flujo»: sólo cuando el listado se pidió filtrado por flujo. */
export function matchedStepsLabel(template: {
  matchedStepCodes?: string[];
}): string | null {
  const count = template.matchedStepCodes?.length;
  if (count === undefined) return null;
  return `Recorre ${count} paso${count === 1 ? "" : "s"} de este flujo`;
}

/** Por qué no se ofrece ejecutar: el motivo del servidor si lo da, y el entorno. */
export function disabledMessage(capabilities: {
  deploymentEnvironment: string;
  disabledReason: string | null;
}): string {
  const reason = capabilities.disabledReason?.trim();
  return reason
    ? `Las corridas de QA están desactivadas en este entorno (${capabilities.deploymentEnvironment}): ${reason}`
    : `Las corridas de QA están desactivadas en este entorno (${capabilities.deploymentEnvironment}).`;
}

/**
 * Qué decirle al operador cuando falla el lanzamiento. Los códigos llegan en `error.code` del
 * sobre de Atlas; `revalidate` indica que la preparación ya no sirve y hay que volver a validarla.
 */
export function launchErrorView(error: unknown): {
  title: string;
  description: string;
  requestId?: string;
  revalidate: boolean;
} {
  const { message, requestId, code = "" } = describeError(error);
  const view = (title: string, description: string, revalidate = false) => ({
    title,
    description,
    requestId,
    revalidate,
  });
  if (code === "PLAN_EXPIRED")
    return view(
      "La preparación venció",
      "Pasaron más de 15 minutos desde que se validó. Vuelve a validar la preparación.",
      true,
    );
  if (code === "PLAN_CHANGED")
    return view(
      "La preparación cambió",
      "La plantilla o el entorno cambiaron desde que se validó. Vuelve a validar la preparación.",
      true,
    );
  if (code === "IDEMPOTENCY_KEY_REUSED")
    return view(
      "Este lanzamiento ya se usó con otro plan",
      "Vuelve a validar la preparación para lanzar una corrida nueva.",
      true,
    );
  if (code === "QA_RUN_ALREADY_ACTIVE")
    return view(
      "Ya hay una corrida en curso",
      "Espera a que termine o cancélala antes de lanzar otra.",
    );
  if (code === "WORKER_UNAVAILABLE")
    return view(
      "El ejecutor de corridas no está disponible",
      "No hay un ejecutor activo que tome la corrida. Espera unos minutos o avisa a operaciones.",
    );
  if (code.startsWith("QA_DISABLED")) {
    const reason = code.slice("QA_DISABLED".length).replace(/^:/, "").trim();
    return view(
      "Las corridas de QA están desactivadas",
      reason ? `Motivo: ${reason}.` : message,
    );
  }
  return view("No se pudo lanzar la corrida", message);
}

export const PERSONA_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  RUNNING: "En curso",
  PASSED: "Pasó",
  FAILED: "Falló",
  BLOCKED: "Bloqueada",
  INDETERMINATE: "Sin conclusión",
  CANCELLED: "Cancelada",
};
