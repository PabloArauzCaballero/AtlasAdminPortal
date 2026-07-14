"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  FRAUD_DECISIONS,
  FRAUD_NEXT_STATUS_VALUES,
  NEXT_STATUS_OPTIONS,
} from "./decision-options";
import { useDecideFraudCaseMutation } from "./hooks";
import type { FraudDecision, NextCustomerStatus, WorkQueueItem } from "./types";

export function FraudDecisionForm({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  const [decision, setDecision] = useState<FraudDecision>(
    "needs_more_investigation",
  );
  const [reasonCode, setReasonCode] = useState("");
  const [applyWatchlist, setApplyWatchlist] = useState(false);
  const [notes, setNotes] = useState("");
  const [nextCustomerStatus, setNextCustomerStatus] = useState<
    NextCustomerStatus | ""
  >("");
  const decide = useDecideFraudCaseMutation();

  const reasonRequired =
    decision === "confirmed_fraud" || decision === "blocked";
  const canSubmit = !reasonRequired || reasonCode.trim().length > 0;
  const nextStatusOptions = NEXT_STATUS_OPTIONS.filter((option) =>
    (FRAUD_NEXT_STATUS_VALUES as string[]).includes(option.value),
  );

  return (
    <DrawerPanel
      open
      title={`Decidir caso de fraude · #${item.caseId}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Decisión">
          <Select
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value as FraudDecision)
            }
          >
            {FRAUD_DECISIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Código de motivo"
          hint={
            reasonRequired
              ? "Obligatorio para fraude confirmado o bloqueo."
              : "Opcional."
          }
        >
          <Textarea
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            className="min-h-9"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-atlas-text">
          <input
            type="checkbox"
            checked={applyWatchlist}
            onChange={(event) => setApplyWatchlist(event.target.checked)}
          />
          Aplicar watchlist (marca teléfono/email hasheados del cliente real)
        </label>
        <Field label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20"
          />
        </Field>
        <Field label="Próximo estado del cliente (opcional)">
          <Select
            value={nextCustomerStatus}
            onChange={(event) =>
              setNextCustomerStatus(
                event.target.value as NextCustomerStatus | "",
              )
            }
          >
            <option value="">Sin cambio</option>
            {nextStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {decide.error ? (
          <ErrorState
            title="No se pudo registrar la decisión"
            description={
              isAtlasApiError(decide.error)
                ? decide.error.message
                : "Error inesperado."
            }
            requestId={
              isAtlasApiError(decide.error) ? decide.error.requestId : undefined
            }
          />
        ) : null}
        {decide.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Caso #{decide.data.caseId} cerrado con decisión &quot;
            {decide.data.decision}&quot;
            {decide.data.watchlistApplied ? " · watchlist aplicada" : ""}.
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={!canSubmit}
            isLoading={decide.isPending}
            loadingText="Guardando…"
            onClick={() =>
              decide.mutate({
                caseId: item.caseId,
                body: {
                  decision,
                  reasonCode: reasonCode.trim() || undefined,
                  applyWatchlist,
                  notes: notes.trim() || undefined,
                  nextCustomerStatus: nextCustomerStatus || undefined,
                },
              })
            }
          >
            Registrar decisión
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </DrawerPanel>
  );
}
