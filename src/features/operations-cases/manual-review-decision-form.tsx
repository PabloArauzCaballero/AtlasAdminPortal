"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  MANUAL_REVIEW_DECISIONS,
  NEXT_STATUS_OPTIONS,
} from "./decision-options";
import { useDecideManualReviewCaseMutation } from "./hooks";
import type {
  ManualReviewDecision,
  NextCustomerStatus,
  WorkQueueItem,
} from "./types";

export function ManualReviewDecisionForm({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  const [decision, setDecision] = useState<ManualReviewDecision>("approved");
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [nextCustomerStatus, setNextCustomerStatus] = useState<
    NextCustomerStatus | ""
  >("");
  const decide = useDecideManualReviewCaseMutation();

  const notesRequired =
    decision === "rejected" || decision === "request_more_information";
  const canSubmit =
    reasonCode.trim().length > 0 && (!notesRequired || notes.trim().length > 0);

  return (
    <DrawerPanel
      open
      title={`Decidir caso de revisión manual · #${item.caseId}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Decisión">
          <Select
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value as ManualReviewDecision)
            }
          >
            {MANUAL_REVIEW_DECISIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Código de motivo">
          <Textarea
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            className="min-h-9"
            placeholder="Ej: identity_verified, insufficient_documents"
          />
        </Field>
        <Field
          label="Notas"
          hint={
            notesRequired
              ? "Obligatorio: el backend exige notas al rechazar o pedir más información."
              : "Opcional."
          }
        >
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
            {NEXT_STATUS_OPTIONS.map((option) => (
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
            {decide.data.decision}&quot;.
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
                  reasonCode: reasonCode.trim(),
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
