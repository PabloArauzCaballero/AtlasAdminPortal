"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { RiskBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";
import { actionErrorMessage } from "./action-error";
import { useRecalculateRiskMutation } from "./customer-actions-hooks";

const QUIEN_RECALCULA = "operación, riesgo y administración";

/**
 * «Recalcular riesgo»: una evaluación nueva, pedida por una persona desde el panel.
 *
 * Se confirma antes porque NO es una lectura: deja una corrida nueva en el historial del cliente y,
 * si faltan datos obligatorios, abre por sí sola un caso de revisión manual.
 */
export function RecalculateRiskAction({
  customerId,
}: Readonly<{ customerId: string }>) {
  const recalcular = useRecalculateRiskMutation(customerId);
  const [confirmando, setConfirmando] = useState(false);
  const bloqueado =
    isAtlasApiError(recalcular.error) &&
    /CUSTOMER_BLOCKED_FOR_RISK_ASSESSMENT|REQUIRED_CONSENT_MISSING/.test(
      `${recalcular.error.code} ${recalcular.error.message}`,
    );
  const error = recalcular.error
    ? actionErrorMessage(recalcular.error, QUIEN_RECALCULA)
    : null;

  return (
    <div className="space-y-2" data-testid="recalculate-risk">
      <Button
        variant="secondary"
        onClick={() => setConfirmando(true)}
        disabled={recalcular.isPending}
        data-testid="recalculate-risk-open"
      >
        <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
        Recalcular riesgo
      </Button>
      {recalcular.data ? (
        <p
          className="flex flex-wrap items-center gap-2 text-sm text-atlas-text"
          role="status"
        >
          Nueva evaluación: <RiskBadge value={recalcular.data.riskLevel} />
          {safeText(recalcular.data.decision)}
          <Link
            href={`/internal/operations/risk-assessments/${recalcular.data.riskAssessmentRunId}`}
            className="font-mono text-xs text-atlas-accent underline"
          >
            corrida #{recalcular.data.riskAssessmentRunId}
          </Link>
          {recalcular.data.manualReviewCaseId ? (
            <span className="text-atlas-muted">
              · abrió el caso de revisión #{recalcular.data.manualReviewCaseId}
            </span>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <ErrorState
          title="No se pudo recalcular el riesgo"
          description={
            bloqueado
              ? "El cliente está bloqueado o no tiene un consentimiento vigente: sin eso no se evalúa."
              : error.message
          }
          requestId={error.requestId}
        />
      ) : null}
      <ConfirmDialog
        open={confirmando}
        title="¿Recalcular el riesgo del cliente?"
        description={`Se hará una evaluación nueva del cliente #${customerId} con sus datos de hoy. Queda en su historial y, si le faltan datos obligatorios, abre un caso de revisión manual.`}
        confirmText="Recalcular"
        isLoading={recalcular.isPending}
        onConfirm={() =>
          recalcular.mutate(undefined, {
            onSettled: () => setConfirmando(false),
          })
        }
        onCancel={() => setConfirmando(false)}
      />
    </div>
  );
}
