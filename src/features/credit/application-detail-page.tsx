"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { RoleGate } from "@/shared/auth/role-gate";
import { CREDIT_OPERATIONS_ROLE_LIST } from "@/shared/auth/portal-roles";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatAmount, formatDateTime, safeText } from "@/shared/lib/format";
import { ApplicationDecisionPanel } from "./application-decision-panel";
import { ApplicationEvents } from "./application-events";
import { BusinessAcceptancePanel } from "./business-acceptance-panel";
import { AcceptanceBadge, ApplicationStatusBadge } from "./credit-badges";
import { DECISION_MODE_LABELS, labelOr, reasonLabel } from "./credit-options";
import { creditErrorMessage } from "./credit-rules";
import { useCreditApplication } from "./hooks";
import type { CreditApplication } from "./types";

export function CreditApplicationDetailPage({
  applicationId,
}: Readonly<{ applicationId: string }>) {
  return (
    <RoleGate roles={CREDIT_OPERATIONS_ROLE_LIST}>
      <DetailContent applicationId={applicationId} />
    </RoleGate>
  );
}

function DetailContent({ applicationId }: Readonly<{ applicationId: string }>) {
  const detail = useCreditApplication(applicationId);
  const application = detail.data?.application;

  return (
    <>
      <PageHeader
        icon={FileText}
        eyebrow="Crédito"
        title={
          application
            ? `Solicitud ${application.applicationCode}`
            : `Solicitud #${applicationId}`
        }
        description="Qué pidió el cliente, qué dijo el motor y qué falta decidir. Las decisiones quedan en el historial."
      />
      {detail.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {detail.error ? (
        <ErrorState
          title={
            isAtlasApiError(detail.error) && detail.error.status === 404
              ? "Solicitud no encontrada."
              : undefined
          }
          description={creditErrorMessage(
            detail.error,
            `No se pudo cargar la solicitud #${applicationId}.`,
          )}
          requestId={
            isAtlasApiError(detail.error) ? detail.error.requestId : undefined
          }
          onRetry={() => void detail.refetch()}
        />
      ) : null}
      {application && detail.data ? (
        <div className="space-y-6">
          <ApplicationSummary application={application} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ApplicationDecisionPanel application={application} />
            <BusinessAcceptancePanel application={application} />
          </div>
          <ApplicationEvents events={detail.data.events} />
        </div>
      ) : null}
    </>
  );
}

function ApplicationSummary({
  application,
}: Readonly<{ application: CreditApplication }>) {
  return (
    <KeyValueSection
      title="Solicitud"
      items={[
        {
          label: "Estado",
          value: <ApplicationStatusBadge value={application.status} />,
        },
        {
          label: "Cliente",
          value: (
            <Link
              href={`/internal/operations/customers/${application.customerId}/investigation-summary`}
              className="font-mono text-atlas-accent underline"
            >
              #{application.customerId}
            </Link>
          ),
        },
        {
          label: "Monto pedido",
          value: `${formatAmount(application.requestedAmount)} ${application.currencyCode}`,
        },
        {
          label: "Plazo",
          value: `${application.requestedTermMonths} meses`,
        },
        { label: "Producto", value: application.creditProductId, mono: true },
        { label: "Enviada", value: formatDateTime(application.submittedAt) },
        {
          label: "Quién decidió",
          value: labelOr(DECISION_MODE_LABELS, application.decisionMode),
        },
        {
          label: "Motivo de la decisión",
          value: application.decisionReasonCode
            ? reasonLabel(application.decisionReasonCode)
            : application.decisionReasonCode,
        },
        {
          label: "Tramo de riesgo",
          value: safeText(application.decisionRiskBand),
        },
        {
          label: "Tasa asignada",
          value:
            application.decisionPricedRate === null
              ? "—"
              : `${Number(application.decisionPricedRate)} %`,
        },
        {
          label: "Resuelta",
          value: application.decidedAt
            ? formatDateTime(application.decidedAt)
            : "Pendiente",
        },
        {
          label: "Caso en la cola",
          value: application.manualReviewCaseCode,
          mono: true,
        },
        {
          label: "Aceptación del negocio",
          value: <AcceptanceBadge value={application.businessAcceptance} />,
        },
        {
          label: "Ejecución del motor",
          value: application.decisionExecutionId,
          mono: true,
        },
      ]}
    />
  );
}
