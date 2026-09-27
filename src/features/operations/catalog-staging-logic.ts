import type { ContextCatalog } from "./types";
import type {
  StagingDecision,
  StagingDecisionBatchInput,
  StagingItem,
} from "./catalog-staging-types";

/** Límites del esquema del servidor (`decisionReason` 5..2000, `decisions` 1..500). */
export const MIN_DECISION_REASON = 5;
export const MAX_DECISION_REASON = 2000;
export const MAX_BATCH = 500;

/** Estados en que la versión destino admite ítems nuevos (guarda del servidor). */
const EDITABLE = new Set(["draft", "pending_approval"]);

/**
 * La versión donde caen los ítems aprobados: la última del catálogo, sólo si todavía se puede
 * editar. Una versión aprobada o publicada es inmutable; aprobar contra ella devuelve 422.
 */
export function editableTarget(
  version: ContextCatalog["currentVersion"] | undefined,
): NonNullable<ContextCatalog["currentVersion"]> | null {
  return version && EDITABLE.has(version.status) ? version : null;
}

/**
 * Por qué un ítem no se puede aprobar tal cual. El servidor exige código y nombre (propuestos o
 * dados en la decisión) y, si falta uno, rechaza el LOTE entero: se avisa antes de enviar.
 */
export function approvalBlocker(item: StagingItem): string | null {
  if (!item.proposedItemCode?.trim()) return "Sin código propuesto";
  if (!item.proposedItemName?.trim()) return "Sin nombre propuesto";
  return null;
}

export function reasonProblem(reason: string): string | undefined {
  const length = reason.trim().length;
  if (length < MIN_DECISION_REASON)
    return `Escribe el motivo (mínimo ${MIN_DECISION_REASON} caracteres).`;
  if (length > MAX_DECISION_REASON)
    return `El motivo no puede pasar de ${MAX_DECISION_REASON} caracteres.`;
  return undefined;
}

export function buildDecisionBatch(
  targetCatalogVersionId: string,
  ids: string[],
  decision: StagingDecision,
  reason: string,
): StagingDecisionBatchInput {
  return {
    targetCatalogVersionId,
    decisions: ids.map((stagingItemId) => ({
      stagingItemId,
      decision,
      decisionReason: reason.trim(),
    })),
  };
}

export type ItemOutcome = {
  stagingItemId: string;
  label: string;
  outcome: "approved" | "rejected" | "not_applied";
};

/**
 * El resultado por ítem. El servidor aplica el lote en una transacción y sólo devuelve totales:
 * si respondió bien, cada ítem enviado quedó con la decisión pedida; si falló, no quedó ninguno.
 */
export function itemOutcomes(
  items: StagingItem[],
  decision: StagingDecision,
  succeeded: boolean,
): ItemOutcome[] {
  return items.map((item) => ({
    stagingItemId: item.stagingItemId,
    label: item.proposedItemName ?? item.proposedItemCode ?? item.stagingItemId,
    outcome: !succeeded
      ? "not_applied"
      : decision === "approve"
        ? "approved"
        : "rejected",
  }));
}
