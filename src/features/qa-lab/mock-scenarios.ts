import type { Option } from "@/shared/lib/options";

/**
 * Escenarios que entiende `AtlasExternalProvidersMock` (el emulador de SEGIP, INFOCENTER, QR,
 * banca, telco, Facebook, WhatsApp y digital trust), vía la cabecera `x-mock-scenario`.
 *
 * Fuente de la lista y de la semántica de los cuatro de transporte:
 * `AtlasExternalProvidersMock/src/scenarios.mjs` (`SUPPORTED_SCENARIOS`, `transportFailureFor`).
 * Los demás son escenarios de negocio: cada módulo de proveedor decide cómo representarlos, así
 * que su descripción es la intención general, no una respuesta fija — ver
 * `GET /mock/providers` para la matriz proveedor × escenario con `supported` y motivo real.
 *
 * No es lista libre a propósito: desde la 2.0 del emulador, pedir un escenario que el proveedor no
 * sabe representar es 422, y uno que no existe es 400 (antes ambos devolvían 200 camino feliz).
 * Ofrecer sólo los 18 declarados evita que el operador tipee uno inventado y no lo note.
 */
export const MOCK_SCENARIO_OPTIONS: Option[] = [
  {
    value: "",
    label: "Sin forzar (default de la corrida)",
    description:
      "No manda x-mock-scenario: el emulador usa el escenario por defecto de la corrida (happy_path salvo que se haya fijado otro).",
  },
  {
    value: "happy_path",
    label: "Camino feliz",
    description: "El proveedor responde con datos válidos, sin fallas.",
  },
  {
    value: "provider_down",
    label: "Proveedor caído",
    description:
      "503 PROVIDER_UNAVAILABLE: el proveedor no está, no es un fallo del backend propio.",
  },
  {
    value: "timeout",
    label: "No contesta (timeout)",
    description:
      "Se queda callado hasta que la llamada se rinde por su propio deadline.",
  },
  {
    value: "slow_response",
    label: "Lento",
    description:
      "Contesta bien pero muy tarde (el triple del techo declarado del proveedor): para ver el p95 subir sin que la corrida se caiga.",
  },
  {
    value: "invalid_payload",
    label: "Payload inválido",
    description:
      "El proveedor rechaza la entrada por formato o datos incompletos.",
  },
  {
    value: "unauthorized",
    label: "Credencial rechazada",
    description:
      "401 UNAUTHORIZED: las credenciales de Atlas contra ESE proveedor no sirven (no es la sesión del cliente final).",
  },
  {
    value: "rate_limited",
    label: "Límite de cuota alcanzado",
    description:
      "429 RATE_LIMITED con Retry-After: cuota del proveedor agotada.",
  },
  {
    value: "not_found",
    label: "Sin coincidencia",
    description: "El dato consultado no existe para ese proveedor.",
  },
  {
    value: "partial_match",
    label: "Coincidencia parcial",
    description: "Coincide a medias: el caso típico que pide revisión manual.",
  },
  {
    value: "data_not_available",
    label: "Dato no disponible",
    description:
      'El proveedor no tiene información para esa consulta (distinto de "no existe": no puede responder).',
  },
  {
    value: "manual_review_required",
    label: "Requiere revisión manual",
    description:
      "El proveedor señala que el caso no se puede resolver automáticamente.",
  },
  {
    value: "cost_blocked",
    label: "Bloqueado por costo",
    description:
      "La política de costo de la integración bloquea la llamada antes de gastarla.",
  },
  {
    value: "duplicate_request",
    label: "Solicitud duplicada",
    description: "El proveedor detecta que ya atendió esta misma solicitud.",
  },
  {
    value: "provider_internal_error",
    label: "Error interno del proveedor",
    description:
      "500 PROVIDER_INTERNAL_ERROR: el proveedor falló por su cuenta.",
  },
  {
    value: "fraud_signal_high",
    label: "Señal de fraude alta",
    description: "El proveedor devuelve indicadores de riesgo altos.",
  },
  {
    value: "low_confidence",
    label: "Confianza baja",
    description:
      "El proveedor responde, pero con baja confianza en el resultado.",
  },
  {
    value: "expired_token",
    label: "Token expirado",
    description:
      "El token de consentimiento o de sesión con el proveedor venció.",
  },
  {
    value: "revoked_consent",
    label: "Consentimiento revocado",
    description:
      "La persona titular revocó el consentimiento que habilitaba la consulta.",
  },
];

export function describeMockScenario(value: string): string {
  return (
    MOCK_SCENARIO_OPTIONS.find((option) => option.value === value)
      ?.description ?? ""
  );
}
