"use client";

import { useState } from "react";
import { useReviewTargetMutation } from "@/features/systems/hooks";
import type {
  DataEntityColumn,
  ReviewDecisionInput,
} from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";

const REVIEW_STATUSES: ReviewDecisionInput["reviewStatus"][] = [
  "APPROVED",
  "NEEDS_REVIEW",
  "REJECTED",
];

const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;

export function ColumnReviewDialog({
  column,
  onClose,
}: Readonly<{
  /** Columna en revisión. `null` cierra el panel. */
  column: DataEntityColumn | null;
  onClose: () => void;
}>) {
  const mutation = useReviewTargetMutation();
  const [reviewStatus, setReviewStatus] =
    useState<ReviewDecisionInput["reviewStatus"]>("APPROVED");
  const [confidenceLevel, setConfidenceLevel] = useState<string>("");
  const [notes, setNotes] = useState("");

  // El backend acepta `notes` opcional, pero rechazar una columna sin decir por
  // qué deja el catálogo sin trazabilidad: quien la vea después no sabe si fue
  // un error de inferencia o una decisión. Se exige motivo al rechazar.
  const notesRequired = reviewStatus === "REJECTED";
  const canSubmit =
    Boolean(column?.columnId) &&
    (!notesRequired || notes.trim().length >= 10) &&
    !mutation.isPending;

  function submit() {
    if (!column?.columnId) return;
    mutation.mutate(
      {
        targetType: "column",
        targetId: column.columnId,
        body: {
          reviewStatus,
          confidenceLevel: confidenceLevel
            ? (confidenceLevel as ReviewDecisionInput["confidenceLevel"])
            : undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setNotes("");
          onClose();
        },
      },
    );
  }

  return (
    <DrawerPanel
      open={column !== null}
      title={`Revisar columna ${column?.columnName ?? ""}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-atlas-muted">
          La metadata de columnas se infiere automáticamente. Revisarla es lo
          que la convierte en catálogo confiable: una columna aprobada se puede
          usar para decisiones de gobierno, una en revisión no.
        </p>

        <Field
          label="Decisión"
          hint="APPROVED da por buena la inferencia; NEEDS_REVIEW la devuelve a la cola; REJECTED la marca como incorrecta."
        >
          <Select
            value={reviewStatus}
            onChange={(event) =>
              setReviewStatus(
                event.target.value as ReviewDecisionInput["reviewStatus"],
              )
            }
          >
            {REVIEW_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Nivel de confianza (opcional)"
          hint="Qué tan seguro estás de la metadata inferida para esta columna."
        >
          <Select
            value={confidenceLevel}
            onChange={(event) => setConfidenceLevel(event.target.value)}
          >
            <option value="">Sin especificar</option>
            {CONFIDENCE_LEVELS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={
            notesRequired
              ? "Motivo del rechazo (obligatorio, mínimo 10 caracteres)"
              : "Notas (opcional)"
          }
          hint="Queda en el registro de revisión. Máximo 1000 caracteres."
        >
          <Textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={
              notesRequired
                ? "Ej: el tipo PII inferido es incorrecto, la columna guarda un código interno."
                : undefined
            }
          />
        </Field>

        {mutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(mutation.error)
                ? mutation.error.message
                : "No se pudo registrar la revisión de la columna."
            }
            requestId={
              isAtlasApiError(mutation.error)
                ? mutation.error.requestId
                : undefined
            }
          />
        ) : null}

        <Button
          variant="primary"
          disabled={!canSubmit}
          isLoading={mutation.isPending}
          loadingText="Registrando…"
          onClick={submit}
        >
          Registrar revisión
        </Button>
      </div>
    </DrawerPanel>
  );
}
