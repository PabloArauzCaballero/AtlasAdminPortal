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

const REVIEW_STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprobada",
  NEEDS_REVIEW: "Pendiente de revisión",
  REJECTED: "Rechazada",
};

const REVIEW_STATUS_HELP: Record<string, string> = {
  APPROVED:
    "Da por buena la propuesta: el campo se puede usar para decisiones de gobierno.",
  NEEDS_REVIEW:
    "La devuelve a la cola de revisión: todavía no es un dato confiable.",
  REJECTED: "La marca como incorrecta.",
};

const CONFIDENCE_LABEL: Record<(typeof CONFIDENCE_LEVELS)[number], string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

const CONFIDENCE_HELP: Record<(typeof CONFIDENCE_LEVELS)[number], string> = {
  LOW: "Tienes dudas sobre lo que dice el catálogo.",
  MEDIUM: "Parece correcto, pero no lo comprobaste del todo.",
  HIGH: "Lo comprobaste y estás seguro de que es correcto.",
};

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
          La descripción de cada columna la deduce el sistema solo. Revisarla es
          lo que la vuelve confiable: una columna aprobada se puede usar para
          decisiones de gobierno, una en revisión no.
        </p>

        <Field
          tooltip="Tu veredicto sobre lo que el sistema dedujo de este campo."
          label="Decisión"
          hint="«Aprobada» la da por buena; «Pendiente de revisión» la devuelve a la cola; «Rechazada» la marca como incorrecta."
        >
          <Select
            name="reviewStatus"
            value={reviewStatus}
            onChange={(valor) =>
              setReviewStatus(valor as ReviewDecisionInput["reviewStatus"])
            }
            options={REVIEW_STATUSES.map((value) => ({
              value,
              label: REVIEW_STATUS_LABEL[value] ?? value,
              description: REVIEW_STATUS_HELP[value],
            }))}
          />
        </Field>

        <Field
          tooltip="Qué tan seguro estás de lo que el sistema dedujo de este campo."
          label="Nivel de confianza (opcional)"
          hint="Qué tan seguro estás de lo que el sistema dedujo de este campo."
        >
          <Select
            name="confidenceLevel"
            value={confidenceLevel}
            onChange={setConfidenceLevel}
            options={[
              {
                value: "",
                label: "Sin especificar",
                description:
                  "No declara nivel de confianza para esta revisión.",
              },
              ...CONFIDENCE_LEVELS.map((value) => ({
                value,
                label: CONFIDENCE_LABEL[value],
                description: CONFIDENCE_HELP[value],
              })),
            ]}
          />
        </Field>

        <Field
          tooltip="Explica tu decisión; al rechazar es obligatorio y queda en el registro de revisión."
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
                ? "Ej.: no guarda datos personales, como se dedujo; guarda un código interno."
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
