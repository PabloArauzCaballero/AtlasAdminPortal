"use client";

import { useId, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { newIdempotencyKey } from "@/shared/api/idempotency";
import { Button } from "@/shared/components/ui/button";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { useStagingDecisionMutation } from "./catalog-staging-hooks";
import {
  approvalBlocker,
  buildDecisionBatch,
  itemOutcomes,
  MAX_DECISION_REASON,
  reasonProblem,
  type ItemOutcome,
} from "./catalog-staging-logic";
import type { StagingDecision, StagingItem } from "./catalog-staging-types";

const OUTCOME_COPY: Record<ItemOutcome["outcome"], string> = {
  approved: "Aprobado: entra en la versión",
  rejected: "Rechazado",
  not_applied: "Sin cambios",
};

/**
 * Confirmación de una decisión en lote, con motivo y resultado por ítem.
 *
 * Se monta sólo mientras está abierta (el padre la pinta condicionalmente), así que la clave de
 * idempotencia nace una vez por apertura: el doble clic y el «Reintentar» tras un corte reenvían
 * la misma y el servidor no crea dos veces los ítems aprobados.
 */
export function StagingDecisionDialog({
  decision,
  items,
  target,
  onClose,
}: Readonly<{
  decision: StagingDecision;
  items: StagingItem[];
  target: { catalogVersionId: string; versionCode: string };
  onClose: () => void;
}>) {
  const titleId = useId();
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const mutation = useStagingDecisionMutation();
  const approving = decision === "approve";
  const blocked = approving
    ? items.filter((item) => approvalBlocker(item) !== null)
    : [];
  const problem = reasonProblem(reason);
  const done = mutation.isSuccess || mutation.isError;
  const outcomes = done
    ? itemOutcomes(items, decision, mutation.isSuccess)
    : null;

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-lg animate-scale-in rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2 id={titleId} className="text-base font-semibold text-atlas-text">
        {approving ? "Aprobar" : "Rechazar"} {items.length} ítem
        {items.length === 1 ? "" : "s"}
      </h2>
      <p className="mt-1 text-sm text-atlas-muted">
        {approving
          ? `Los aprobados se agregan a la versión ${target.versionCode} del catálogo.`
          : "Los rechazados no entran al catálogo; quedan registrados con su motivo."}{" "}
        Se aplican todos o ninguno.
      </p>

      {outcomes ? (
        <ResultList
          outcomes={outcomes}
          summary={
            mutation.data
              ? `${mutation.data.approved} aprobados, ${mutation.data.rejected} rechazados, ${mutation.data.itemsCreated} ítems creados.`
              : null
          }
        />
      ) : null}

      {mutation.error ? (
        <div className="mt-3">
          <ErrorState
            title="No se aplicó ninguna decisión"
            description={
              isAtlasApiError(mutation.error)
                ? mutation.error.message
                : "Error inesperado al decidir el lote."
            }
            requestId={
              isAtlasApiError(mutation.error)
                ? mutation.error.requestId
                : undefined
            }
          />
        </div>
      ) : null}

      {mutation.isSuccess ? (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (problem || blocked.length > 0) return;
            mutation.mutate({
              body: buildDecisionBatch(
                target.catalogVersionId,
                items.map((item) => item.stagingItemId),
                decision,
                reason,
              ),
              idempotencyKey,
            });
          }}
        >
          {blocked.length > 0 ? (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"
            >
              {blocked.length} ítem{blocked.length === 1 ? "" : "s"} no tiene
              {blocked.length === 1 ? "" : "n"} código o nombre propuesto y no
              se puede aprobar. Quítalo
              {blocked.length === 1 ? "" : "s"} de la selección o recházalo
              {blocked.length === 1 ? "" : "s"}.
            </p>
          ) : null}
          <Field
            label="Motivo"
            required
            tooltip="Por qué apruebas o rechazas estos ítems; queda guardado en cada uno."
            error={touched ? problem : undefined}
            hint={`${reason.trim().length}/${MAX_DECISION_REASON}`}
          >
            <Textarea
              rows={3}
              maxLength={MAX_DECISION_REASON}
              value={reason}
              placeholder="Ej.: nombres verificados contra el padrón oficial."
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={approving ? "primary" : "danger"}
              isLoading={mutation.isPending}
              loadingText="Aplicando…"
              disabled={blocked.length > 0}
            >
              {mutation.isError
                ? "Reintentar"
                : approving
                  ? "Aprobar lote"
                  : "Rechazar lote"}
            </Button>
          </div>
        </form>
      )}
    </DialogShell>
  );
}

function ResultList({
  outcomes,
  summary,
}: Readonly<{ outcomes: ItemOutcome[]; summary: string | null }>) {
  return (
    <section aria-label="Resultado por ítem" className="mt-3">
      {summary ? (
        <p role="status" className="text-sm font-medium text-emerald-800">
          {summary}
        </p>
      ) : null}
      <ul className="mt-2 max-h-56 space-y-1 overflow-auto text-sm">
        {outcomes.map((outcome) => (
          <li
            key={outcome.stagingItemId}
            className="flex justify-between gap-3 border-b border-atlas-border/60 py-1 last:border-0"
          >
            <span className="min-w-0 truncate">{outcome.label}</span>
            <span
              className={
                outcome.outcome === "not_applied"
                  ? "shrink-0 text-atlas-muted"
                  : outcome.outcome === "approved"
                    ? "shrink-0 text-emerald-700"
                    : "shrink-0 text-red-700"
              }
            >
              {OUTCOME_COPY[outcome.outcome]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
