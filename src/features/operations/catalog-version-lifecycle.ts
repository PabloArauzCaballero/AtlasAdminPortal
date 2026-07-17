import type { CatalogDecision } from "./catalog-version-schema";
import type { CatalogVersionStatus } from "./catalog-version-types";

/**
 * Acciones legales por estado. Vive fuera de los componentes porque es la regla
 * de negocio del flujo de aprobación, no una decisión de pintado: la pantalla
 * solo ofrece lo que el backend acepta, así el operador no descubre un 422
 * (`CATALOG_VERSION_NOT_DRAFT`) después de escribir una justificación.
 *
 * Se alinea con `CatalogVersionWorkflowService`, con dos aclaraciones:
 *
 * 1. El backend permite `publish` también desde `pending_approval` (su guarda
 *    acepta `['approved', 'pending_approval']`). No se ofrece a propósito:
 *    saltearía el registro de aprobación, que es el punto del flujo. Publicar
 *    exige pasar antes por `approve`.
 * 2. El backend NO valida el estado previo para `reject` ni para `retire`
 *    (no tienen guarda). Acá se restringen a los estados donde tienen sentido
 *    — rechazar algo ya publicado o retirar un borrador dejaría el catálogo en
 *    un estado que nadie puede explicar después.
 */
const DECISIONS_BY_STATUS: Record<CatalogVersionStatus, CatalogDecision[]> = {
  draft: [],
  pending_approval: ["approve", "reject"],
  approved: ["publish"],
  published: ["retire"],
  retired: [],
  rejected: [],
};

/** `true` cuando la versión admite `submit-for-approval` (solo borradores). */
export function canSubmitForApproval(status: CatalogVersionStatus): boolean {
  return status === "draft";
}

/** Decisiones (admin) que el backend acepta para el estado dado. */
export function allowedDecisions(
  status: CatalogVersionStatus,
): readonly CatalogDecision[] {
  return DECISIONS_BY_STATUS[status] ?? [];
}

/** `true` cuando la versión ya no admite ninguna acción: es historial. */
export function isTerminalStatus(status: CatalogVersionStatus): boolean {
  return !canSubmitForApproval(status) && allowedDecisions(status).length === 0;
}

/**
 * `true` cuando una versión de ruleset admite activación. El backend solo la
 * acepta desde `draft`, `inactive` o `approved` (si no, 422
 * `RULESET_VERSION_NOT_ACTIVATABLE`): activar algo ya activo o retirado no
 * tiene sentido, así que el botón no se pinta.
 */
export function canActivateRuleset(status: string | null | undefined): boolean {
  return ["draft", "inactive", "approved"].includes(status ?? "");
}

/** Decisiones que se consideran consecuentes y piden doble confirmación. */
export function requiresTypedConfirmation(decision: CatalogDecision): boolean {
  return decision === "publish" || decision === "retire";
}

export const DECISION_LABELS: Record<CatalogDecision, string> = {
  approve: "Aprobar",
  reject: "Rechazar",
  publish: "Publicar",
  retire: "Retirar",
};

export const STATUS_LABELS: Record<CatalogVersionStatus, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente de aprobación",
  approved: "Aprobada",
  published: "Publicada",
  retired: "Retirada",
  rejected: "Rechazada",
};

/** Qué significa el estado para el negocio, en la ficha de la versión. */
export const STATUS_HELP: Record<CatalogVersionStatus, string> = {
  draft:
    "Borrador editable. No afecta a ninguna regla en producción hasta que se publique.",
  pending_approval:
    "Enviada a aprobación. Espera la decisión de un administrador; sigue sin afectar producción.",
  approved:
    "Aprobada pero todavía no vigente. Falta publicarla para que las reglas la usen.",
  published:
    "Vigente: las reglas de negocio están leyendo esta versión del catálogo.",
  retired: "Retirada de servicio. Queda como historial para auditoría.",
  rejected: "Rechazada. Queda como historial; hay que crear una versión nueva.",
};
