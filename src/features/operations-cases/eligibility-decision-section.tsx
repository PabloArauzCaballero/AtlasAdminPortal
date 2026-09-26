"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { actionErrorMessage } from "./action-error";
import { BlockerList } from "./blocker-list";
import { useEligibilityDecisionMutation } from "./customer-actions-hooks";
import type { EligibilityDecision } from "./customer-actions-types";
import {
  DECISION_TARGET,
  DECISIONS_WITHOUT_NOTE,
  eligibilityDecisionOptions,
  firstAllowedDecision,
  isDecisionAllowed,
  lifecycleLabel,
} from "./eligibility-options";

const QUIEN_DECIDE = "operación, riesgo, cumplimiento y administración";

/**
 * La decisión humana de habilitación del cliente (aprobar, observar, suspender, rechazar,
 * reincorporar), contra la máquina de estados canónica.
 *
 * Sólo se ofrecen las transiciones legales desde el estado actual; las demás aparecen
 * deshabilitadas con el motivo. Se confirma antes de enviar porque cambia el estado del cliente y
 * queda en su historial con tu usuario.
 */
export function EligibilityDecisionSection({
  customerId,
  currentStatus,
}: Readonly<{ customerId: string; currentStatus: string | null }>) {
  const decidir = useEligibilityDecisionMutation(customerId);
  const inicial = firstAllowedDecision(currentStatus);
  const [decision, setDecision] = useState<EligibilityDecision | null>(inicial);
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const elegida =
    decision && isDecisionAllowed(currentStatus, decision) ? decision : inicial;
  const exigeNota = elegida !== null && !DECISIONS_WITHOUT_NOTE.has(elegida);
  const listo =
    elegida !== null &&
    reasonCode.trim() !== "" &&
    (!exigeNota || notes.trim() !== "");
  const error = decidir.error
    ? actionErrorMessage(decidir.error, QUIEN_DECIDE)
    : null;

  function enviar() {
    if (!elegida) return;
    decidir.mutate(
      {
        decision: elegida,
        reasonCode: reasonCode.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      { onSettled: () => setConfirmando(false) },
    );
  }

  return (
    <section
      className="rounded-2xl border border-atlas-border bg-white shadow-subtle"
      data-testid="eligibility-decision-section"
    >
      <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-atlas-text">
          Decisión de habilitación
        </h2>
        <p className="mt-1 text-xs text-atlas-muted">
          Estado actual: <strong>{lifecycleLabel(currentStatus)}</strong>.
          Aprobar con bloqueadores pendientes queda registrado como excepción
          autorizada, con la lista de lo que se omitió.
        </p>
      </div>
      <form
        className="space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (listo) setConfirmando(true);
        }}
      >
        {inicial === null ? (
          <p
            className="text-sm text-atlas-muted"
            data-testid="eligibility-none"
          >
            Desde «{lifecycleLabel(currentStatus)}» no hay ninguna decisión de
            habilitación posible.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Decisión"
                tooltip="A qué estado pasa el cliente. Las opciones grises no las permite su estado actual."
              >
                <Select
                  name="eligibility-decision"
                  testId="eligibility-decision"
                  options={eligibilityDecisionOptions(currentStatus)}
                  value={elegida ?? undefined}
                  onChange={(valor) =>
                    setDecision(valor as EligibilityDecision)
                  }
                />
              </Field>
              <Field
                label="Código de motivo"
                required
                tooltip="Código corto que resume la decisión para los informes. Ej.: kyc_completo, documento_dudoso"
              >
                <Input
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  data-testid="eligibility-reason"
                />
              </Field>
            </div>
            <Field
              label="Nota"
              required={exigeNota}
              tooltip="Qué comprobaste y por qué decides así. Quedará en el historial del cliente."
              hint={
                exigeNota
                  ? "Obligatoria: toda decisión negativa se justifica por escrito."
                  : "Opcional al aprobar o reincorporar."
              }
            >
              <Textarea
                className="min-h-16"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                data-testid="eligibility-notes"
              />
            </Field>
            {error ? (
              <ErrorState
                title="No se pudo registrar la decisión"
                description={error.message}
                requestId={error.requestId}
              />
            ) : null}
            {decidir.data ? (
              <div
                className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                role="status"
                data-testid="eligibility-result"
              >
                <p>
                  {decidir.data.statusChanged
                    ? `El cliente pasó de «${lifecycleLabel(decidir.data.previousStatus)}» a «${lifecycleLabel(decidir.data.lifecycleStatus)}».`
                    : `El cliente sigue en «${lifecycleLabel(decidir.data.lifecycleStatus)}».`}
                </p>
                {decidir.data.overriddenBlockers.length > 0 ? (
                  <p className="text-amber-800">
                    Excepción autorizada: se omitieron{" "}
                    {decidir.data.overriddenBlockers.length} bloqueador(es).
                  </p>
                ) : null}
                <BlockerList
                  eligible={decidir.data.eligible}
                  blockers={decidir.data.blockers}
                />
              </div>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={!listo || decidir.isPending}
              data-testid="eligibility-submit"
            >
              Registrar decisión
            </Button>
          </>
        )}
      </form>
      <ConfirmDialog
        open={confirmando}
        title="¿Registrar la decisión de habilitación?"
        description={
          elegida
            ? `El cliente #${customerId} pasará de «${lifecycleLabel(currentStatus)}» a «${lifecycleLabel(DECISION_TARGET[elegida])}». Queda en su historial con tu usuario.`
            : ""
        }
        confirmText="Registrar"
        isLoading={decidir.isPending}
        onConfirm={enviar}
        onCancel={() => setConfirmando(false)}
      />
    </section>
  );
}
