import type { Option } from "@/shared/lib/options";

/**
 * Filtros por lo que la gente busca de verdad, no por cada valor posible de la columna.
 *
 * «Con problema» agrupa los cuatro estados de fallo porque nadie entra buscando exactamente un
 * `PROVIDER_AUTH_FAILED`: entra buscando qué salió mal.
 */
export const DESENLACE_OPTIONS: Option[] = [
  {
    value: "FAILED,PROVIDER_UNAVAILABLE,PROVIDER_AUTH_FAILED,RATE_LIMITED",
    label: "Con problema",
    description:
      "Fallaron, el proveedor no respondió, rechazó las credenciales o nos limitó.",
  },
  {
    value: "BLOCKED_BY_COST_POLICY,CONSENT_REQUIRED,MANUAL_APPROVAL_REQUIRED",
    label: "Frenadas por política",
    description:
      "No salieron: las paró el costo, la falta de consentimiento o una aprobación pendiente.",
  },
  {
    value: "COMPLETED,MOCKED",
    label: "Con respuesta",
    description: "El proveedor, o su simulador, devolvió datos.",
  },
  {
    value: "CACHED",
    label: "Servidas desde caché",
    description:
      "Se reutilizó una respuesta reciente sin volver a pagar la consulta.",
  },
];

/** Los dos valores que escribe el backend en `approval_status`; sin aprobación queda vacío. */
export const APROBACION_OPTIONS: Option[] = [
  {
    value: "approved",
    label: "Aprobada por un administrador",
    description:
      "Esperaba aprobación manual y un administrador la dio después.",
  },
  {
    value: "approved_inline",
    label: "Aprobada al lanzarla",
    description: "Quien la lanzó traía ya la aprobación de un administrador.",
  },
];
