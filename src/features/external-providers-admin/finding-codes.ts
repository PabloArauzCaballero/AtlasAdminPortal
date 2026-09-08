import type { Severity } from "./types";

/**
 * Traducción de los códigos del backend a castellano, con lo que hay que HACER.
 *
 * El backend devuelve códigos, y hace bien: son estables, se pueden buscar en los registros y no
 * dependen del idioma de nadie. Pero la pantalla los pintaba tal cual, dentro de un JSON, y
 * `PRODUCTION_INTEGRATION_GATE_BLOCKED` no le dice nada a quien tiene que decidir si se puede
 * publicar. La traducción vive AQUÍ y no en el backend por eso mismo: el código es el contrato,
 * el texto es la interfaz.
 *
 * Un código desconocido no rompe nada: se muestra su literal. Es lo correcto para un catálogo que
 * el backend puede ampliar sin avisar, y evita el fallo silencioso de esconder un hallazgo nuevo
 * porque nadie lo tradujo todavía.
 */

export type Tone = "default" | "success" | "warning" | "critical" | "info" | "muted";

type Explicacion = {
  label: string;
  summary: string;
  action?: string;
  tone?: Tone;
};

const HALLAZGOS: Record<string, Explicacion> = {
  ADAPTER_MISSING: {
    label: "Sin conector",
    summary: "El proveedor está en el catálogo pero no hay código que sepa hablar con él.",
    action: "Registrar su adaptador en el backend o retirar el proveedor del catálogo.",
  },
  CONSENT_DISABLED_FOR_SENSITIVE_PROVIDER: {
    label: "Consulta sin consentimiento",
    summary:
      "Es un proveedor de datos sensibles (identidad, crédito, telco, redes) configurado para consultarse sin pedir consentimiento al cliente.",
    action: "Activar el consentimiento obligatorio para este proveedor.",
  },
  MISSING_COST_POLICY: {
    label: "Sin política de costo",
    summary: "Nadie fijó cuánto cuesta consultarlo ni cuántas veces se puede consultar.",
    action: "Definir su política de costo por tipo de consulta.",
  },
  HIGH_COST_NOT_BLOCKED: {
    label: "Consulta cara sin freno",
    summary:
      "Una consulta de costo alto puede ejecutarse sola, sin aprobación de nadie. Es el control que evita que el gasto se dispare.",
    action: "Marcar esa consulta como bloqueada por defecto y con aprobación manual.",
  },
  POLICY_WITHOUT_ALLOWED_STAGES: {
    label: "Política sin etapas",
    summary: "La política no dice en qué momento del proceso se permite esa consulta, así que vale en todos.",
    action: "Declarar las etapas permitidas.",
  },
  PRODUCTION_INTEGRATION_GATE_BLOCKED: {
    label: "No puede pasar a producción",
    summary: "Falta algo para hablar con el proveedor real: la integración, una credencial, o ambas.",
    action: "Ver el detalle del bloqueo; cada uno nombra exactamente qué falta.",
  },
  PRODUCTION_MODE_IN_NON_PRODUCTION_PROVIDER: {
    label: "Contradicción de configuración",
    summary: "Está puesto en modo producción un proveedor marcado como sólo simulado o sólo sandbox.",
    action: "Corregir el modo o el estado del proveedor: los dos no pueden ser ciertos.",
  },
  IDEMPOTENCY_KEY_REUSED_DIFFERENT_SCOPE: {
    label: "Clave reutilizada con otro contenido",
    summary:
      "La misma clave de no-repetición se usó para consultas distintas. Puede devolver a un cliente la respuesta pedida para otro.",
    action: "Revisar quién genera esas claves.",
  },
  IDEMPOTENCY_REPLAY_SAME_SCOPE: {
    label: "Repetición idéntica",
    summary: "La misma consulta se pidió más de una vez con la misma clave. Es el comportamiento esperado.",
    tone: "muted",
  },
  POSSIBLE_UNREDACTED_SECRET_KEY: {
    label: "Posible dato sin tachar",
    summary: "En una respuesta guardada aparece una clave que suele contener un secreto o un dato personal.",
    action: "Revisar esa respuesta y añadir la clave a la lista de campos que se tachan.",
  },
};

/** Bloqueos de readiness y de la compuerta de producción. Son frases, no hallazgos con severidad. */
const BLOQUEOS: Record<string, string> = {
  ADAPTER_MISSING: "No hay conector para este proveedor.",
  PROVIDER_DISABLED: "El proveedor está deshabilitado en el catálogo.",
  MODE_DISABLED: "Su modo está en «deshabilitado»: no se le llama.",
  NO_COST_POLICY: "No tiene política de costo definida.",
  HEALTH_DOWN: "La última comprobación dice que no responde.",
  PROVIDER_NOT_FOUND: "No existe un proveedor con ese código.",
  CRITICAL_QUALITY_FINDINGS: "Hay hallazgos críticos de calidad sin resolver.",
  HIGH_QUALITY_FINDINGS_STRICT_MODE: "Hay hallazgos altos y la comprobación se pidió en modo estricto.",
  SANITIZATION_AUDIT_FAILED: "La auditoría de datos tachados no pasó.",
};

/** Estados de respuesta de una solicitud. */
const ESTADOS: Record<string, Explicacion> = {
  COMPLETED: { label: "Completada", summary: "El proveedor respondió con datos.", tone: "success" },
  MOCKED: {
    label: "Simulada",
    summary: "Respondió un simulador, no el proveedor real. Los datos no valen para decidir.",
    tone: "info",
  },
  CACHED: { label: "Desde caché", summary: "Se reutilizó una respuesta anterior, sin volver a llamar.", tone: "muted" },
  DATA_NOT_AVAILABLE: {
    label: "Sin datos",
    summary: "El proveedor respondió, pero no tiene información de esta persona.",
    tone: "warning",
  },
  FAILED: { label: "Falló", summary: "La llamada no llegó a completarse.", tone: "critical" },
  PROVIDER_UNAVAILABLE: { label: "Proveedor caído", summary: "El proveedor no respondió.", tone: "critical" },
  PROVIDER_AUTH_FAILED: {
    label: "Credencial rechazada",
    summary: "El proveedor rechazó nuestras credenciales.",
    tone: "critical",
  },
  RATE_LIMITED: {
    label: "Límite alcanzado",
    summary: "El proveedor rechazó la llamada por exceso de consultas.",
    tone: "warning",
  },
  BLOCKED_BY_COST_POLICY: {
    label: "Bloqueada por costo",
    summary: "No se ejecutó porque es una consulta cara que exige aprobación.",
    tone: "warning",
  },
  CONSENT_REQUIRED: {
    label: "Falta consentimiento",
    summary: "El cliente no autorizó esta consulta.",
    tone: "warning",
  },
  MANUAL_APPROVAL_REQUIRED: {
    label: "Espera aprobación",
    summary: "Necesita que un administrador la apruebe antes de ejecutarse.",
    tone: "warning",
  },
  PENDING: { label: "En curso", summary: "La solicitud se registró y todavía no tiene respuesta.", tone: "muted" },
};

export const SEVERIDADES: Record<Severity, { label: string; tone: Tone }> = {
  CRITICAL: { label: "Crítico", tone: "critical" },
  HIGH: { label: "Alto", tone: "critical" },
  MEDIUM: { label: "Medio", tone: "warning" },
  LOW: { label: "Bajo", tone: "muted" },
};

export function explainFinding(code: string): Explicacion {
  return HALLAZGOS[code] ?? { label: code, summary: "Hallazgo sin descripción en el catálogo del portal." };
}

/**
 * Un bloqueo puede venir con el código del proveedor pegado delante
 * (`INFOCENTER_REAL_INTEGRATION_NOT_IMPLEMENTED`, `SEGIP_CLIENT_SECRET_MISSING`). Se traduce el
 * sufijo y se conserva el prefijo como sujeto de la frase, en vez de dejar la cadena entera cruda.
 */
export function explainBlocker(blocker: string): string {
  if (BLOQUEOS[blocker]) return BLOQUEOS[blocker];
  if (blocker.endsWith("_REAL_INTEGRATION_NOT_IMPLEMENTED")) {
    return `${blocker.replace("_REAL_INTEGRATION_NOT_IMPLEMENTED", "")}: no está implementada la integración con el proveedor real.`;
  }
  if (blocker.endsWith("_MOCK_MODE_IN_PRODUCTION")) {
    return `${blocker.replace("_MOCK_MODE_IN_PRODUCTION", "")}: está en modo simulado sobre un despliegue productivo, y eso queda bloqueado.`;
  }
  if (blocker.endsWith("_MOCK_ALLOWED_IN_PRODUCTION")) {
    return `${blocker.replace("_MOCK_ALLOWED_IN_PRODUCTION", "")}: tiene activada la excepción que permite datos simulados en producción.`;
  }
  if (blocker.endsWith("_MISSING")) {
    return `Falta la variable de entorno ${blocker.replace("_MISSING", "")}.`;
  }
  if (blocker.endsWith("_NOT_READY_FOR_MOCK")) {
    return `${blocker.replace("_NOT_READY_FOR_MOCK", "")}: no puede ni siquiera ejecutarse en modo simulado.`;
  }
  if (blocker.endsWith("_PRODUCTION_NOT_READY")) {
    return `${blocker.replace("_PRODUCTION_NOT_READY", "")}: está en modo producción sin cumplir los requisitos.`;
  }
  if (blocker.endsWith("_NO_COST_POLICY")) {
    return `${blocker.replace("_NO_COST_POLICY", "")}: no tiene política de costo.`;
  }
  if (blocker.endsWith("_HEALTH_DOWN")) {
    return `${blocker.replace("_HEALTH_DOWN", "")}: no responde.`;
  }
  return blocker;
}

export function explainStatus(status: string): Explicacion {
  return ESTADOS[status.toUpperCase()] ?? { label: status, summary: "Estado sin descripción en el catálogo del portal." };
}
