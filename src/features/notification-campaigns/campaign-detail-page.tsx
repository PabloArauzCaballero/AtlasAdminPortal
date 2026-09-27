"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { CAMPAIGN_READ_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { CampaignActions } from "./campaign-actions";
import { CampaignStatusBadge } from "./campaign-columns";
import { CampaignMessagesSection } from "./campaign-messages-section";
import { CampaignMetrics } from "./campaign-metrics";
import { PURPOSE_LABEL, describeRule } from "./campaign-options";
import { useCampaign } from "./hooks";
import type { NotificationCampaign } from "./types";

export function CampaignDetailPage({
  campaignId,
}: Readonly<{ campaignId: string }>) {
  return (
    <RoleGate roles={CAMPAIGN_READ_ROLE_LIST}>
      <AuthorizedCampaignDetail campaignId={campaignId} />
    </RoleGate>
  );
}

function AuthorizedCampaignDetail({
  campaignId,
}: Readonly<{ campaignId: string }>) {
  const campaign = useCampaign(campaignId);
  const data = campaign.data;

  return (
    <>
      <PageHeader
        icon={Megaphone}
        eyebrow="Campañas"
        title={data ? data.name : `Campaña #${campaignId}`}
        description={data?.title}
        actions={
          <Link
            href="/internal/notifications/campaigns"
            className="inline-flex items-center rounded-md border border-atlas-border px-3 py-1.5 text-xs text-atlas-text hover:bg-atlas-soft"
          >
            Volver a campañas
          </Link>
        }
      />
      {campaign.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {campaign.error ? (
        <ErrorState
          description={
            isAtlasApiError(campaign.error)
              ? campaign.error.message
              : "No se pudo cargar la campaña."
          }
          requestId={
            isAtlasApiError(campaign.error)
              ? campaign.error.requestId
              : undefined
          }
          onRetry={() => void campaign.refetch()}
        />
      ) : null}
      {data ? <CampaignDetail campaign={data} /> : null}
    </>
  );
}

function CampaignDetail({
  campaign,
}: Readonly<{ campaign: NotificationCampaign }>) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CampaignStatusBadge value={campaign.status} />
            <span className="text-xs text-atlas-muted">
              {`Actualizada ${formatDateTime(campaign.updatedAt)}`}
            </span>
          </div>
          <CampaignActions campaign={campaign} />
        </div>
        {campaign.cancelReason ? (
          <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            {`Cancelada ${formatDateTime(campaign.cancelledAt)}: ${campaign.cancelReason}`}
          </p>
        ) : null}
        {campaign.lastError ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {`Último error: ${campaign.lastError}`}
          </p>
        ) : null}
        <h2 className="mb-3 text-base font-semibold text-atlas-text">
          Avance del envío
        </h2>
        <CampaignMetrics campaign={campaign} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-atlas-text">
            Lo que recibe el cliente
          </h2>
          <KeyValueGrid
            items={[
              { label: "Título", value: campaign.title },
              { label: "Texto", value: campaign.body },
              {
                label: "Al tocarlo lleva a",
                value: safeText(campaign.deepLink),
                mono: true,
              },
              { label: "Canales", value: campaign.channels.join(", ") },
              {
                label: "Tipo",
                value: PURPOSE_LABEL[campaign.purpose] ?? campaign.purpose,
              },
            ]}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-atlas-text">
            A quién y cuándo
          </h2>
          <KeyValueGrid
            items={[
              { label: "Audiencia", value: audienceText(campaign) },
              {
                label: "Personas",
                value: formatNumber(campaign.targetedCount),
              },
              {
                label: "Avisos generados",
                value: formatNumber(campaign.createdCount),
              },
              { label: "Empieza", value: formatDateTime(campaign.startsAt) },
              { label: "Termina", value: formatDateTime(campaign.endsAt) },
              {
                label: "Ritmo",
                value: campaign.ratePerMinute
                  ? `${formatNumber(campaign.ratePerMinute)} por minuto`
                  : "—",
              },
              {
                label: "Tope de personas",
                value: formatNumber(campaign.maxRecipients),
              },
              { label: "La creó", value: safeText(campaign.createdBy) },
              { label: "La programó", value: safeText(campaign.scheduledBy) },
            ]}
          />
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold text-atlas-text">
          Avisos de la campaña
        </h2>
        <p className="mb-4 text-sm text-atlas-muted">
          Uno por persona y canal. Una persona sin la app con avisos o sin
          correo verificado sólo recibe los canales que puede recibir.
        </p>
        <CampaignMessagesSection campaignId={campaign.id} />
      </Card>
    </div>
  );
}

function audienceText(campaign: NotificationCampaign): string {
  const rules = campaign.audience?.rules ?? [];
  if (rules.length === 0) return "Sin filtros: toda la base de clientes";
  const joiner = campaign.audience?.match === "any" ? " o " : " y ";
  return rules.map(describeRule).join(joiner);
}
