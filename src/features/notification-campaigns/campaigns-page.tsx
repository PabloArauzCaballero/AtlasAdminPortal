"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { CAMPAIGN_READ_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { buildCampaignColumns } from "./campaign-columns";
import { CAMPAIGN_STATUS_OPTIONS } from "./campaign-options";
import { useCampaigns } from "./hooks";
import { SegmentsSection } from "./segments-section";

const tabs = ["Campañas", "Segmentos"];

/**
 * Campañas de notificación masiva, vistas desde el portal admin.
 *
 * Decisión D-6 del plan de procesos (2026-09-26): el admin OBSERVA y puede FRENAR; el ERP crea.
 * Por eso aquí no hay «Nueva campaña», ni edición, ni programar, ni duplicar, ni envío de prueba,
 * aunque el servidor los tenga: dos consolas que crean lo mismo terminan con dos versiones de la
 * misma campaña y nadie sabe cuál salió.
 */
export function CampaignsPage() {
  return (
    <RoleGate roles={CAMPAIGN_READ_ROLE_LIST}>
      <AuthorizedCampaignsPage />
    </RoleGate>
  );
}

function AuthorizedCampaignsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const campaigns = useCampaigns({ page, limit: 20, status, search });
  const columns = useMemo(() => buildCampaignColumns(), []);

  return (
    <>
      <PageHeader
        icon={Megaphone}
        eyebrow="Mensajería interna"
        title="Campañas"
        description="Las campañas de avisos masivos a clientes: en qué estado está cada una, a cuánta gente apunta y cómo le va a cada canal."
      />
      <BusinessContextNote>
        Las campañas se arman, se prueban y se programan en el ERP. Aquí se
        siguen y, si algo sale mal, se frenan: pausar detiene el reparto,
        reanudar lo retoma y cancelar anula para siempre lo que todavía no
        salió, con un motivo que queda escrito. Nada de esta pantalla crea ni
        cambia el contenido de una campaña.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Campañas" ? (
        <div className="space-y-4">
          <FilterBar
            search={search}
            searchPlaceholder="Buscar por nombre…"
            searchTooltip="Parte del nombre con el que se creó la campaña en el ERP."
            filters={[
              {
                name: "status",
                label: "Estado",
                tooltip:
                  "En qué punto de su vida está la campaña; «Enviando» es la que se puede pausar.",
                value: status,
                options: CAMPAIGN_STATUS_OPTIONS,
              },
            ]}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onFilterChange={(name, value) => {
              if (name === "status") setStatus(value);
              setPage(1);
            }}
            onClear={() => {
              setStatus("");
              setSearch("");
              setPage(1);
            }}
          />
          {campaigns.isLoading ? <LoadingSkeleton rows={6} /> : null}
          {campaigns.error ? (
            <ErrorState
              description={
                isAtlasApiError(campaigns.error)
                  ? campaigns.error.message
                  : "No se pudieron cargar las campañas."
              }
              requestId={
                isAtlasApiError(campaigns.error)
                  ? campaigns.error.requestId
                  : undefined
              }
              onRetry={() => void campaigns.refetch()}
            />
          ) : null}
          {campaigns.data ? (
            <DataTable
              data={campaigns.data.items}
              columns={columns}
              meta={campaigns.data.meta}
              onPageChange={setPage}
              emptyTitle="No hay campañas para estos filtros."
              emptyDescription="Las campañas nacen en el ERP (Control → Notificaciones masivas); cuando exista una, aparecerá aquí."
            />
          ) : null}
        </div>
      ) : (
        <SegmentsSection />
      )}
    </>
  );
}
