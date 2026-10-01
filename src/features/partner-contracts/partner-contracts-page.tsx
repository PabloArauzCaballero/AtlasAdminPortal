"use client";

import { useMemo, useState } from "react";
import { FileSignature } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { buildContractColumns } from "./contract-columns";
import { useContractTemplates, useSetDefaultContractTemplate } from "./hooks";
import type { PartnerContractTemplate } from "./types";
import { DialogoPublicar } from "./partner-contracts-pieces";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 20;

const ESTADO_OPTIONS = [
  {
    value: "active",
    label: "Vigentes",
    description: "Las que rigen hoy o pueden marcarse como vigentes.",
  },
  {
    value: "archived",
    label: "Archivadas",
    description: "Las que rigieron antes: son la prueba de qué regía cada día.",
  },
];

/**
 * El contrato bajo el que se afilia un comercio.
 *
 * ## Qué faltaba
 *
 * La verificación del expediente comprobaba matrícula, representante, QR y correo —todo lo que
 * prueba que el comercio EXISTE y es quien dice— y nada comprobaba que hubiera un contrato. Se
 * habilitaba a cobrar a un comercio con el que no se había pactado por escrito ni la comisión, ni
 * los plazos de liquidación, ni qué pasa con una devolución.
 *
 * ## Qué es y qué NO es
 *
 * El texto POR DEFECTO del inquilino: el que rige cuando a un comercio nadie le negoció uno propio.
 * Un contrato particular es un término comercial y se lleva en el ERP, igual que la comisión.
 *
 * ## Por qué no hay botón de editar
 *
 * No es un descuido. Un contrato es la evidencia de a qué se comprometió alguien un día concreto:
 * editarlo en sitio borraría el texto que un comercio aceptó de verdad y dejaría su expediente
 * afirmando algo que ya no se puede comprobar. Publicar crea una versión y archiva la anterior, y
 * las archivadas se siguen viendo porque son la prueba de qué regía cada día.
 */
export function PartnerContractsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedPartnerContractsPage />
    </RoleGate>
  );
}

function AuthorizedPartnerContractsPage() {
  const [publicando, setPublicando] = useState(false);
  const [porDefecto, setPorDefecto] = useState<PartnerContractTemplate | null>(
    null,
  );
  const [viendo, setViendo] = useState<PartnerContractTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const plantillas = useContractTemplates({
    page,
    limit: usePageSize(POR_PAGINA),
    q,
    status,
  });
  const marcar = useSetDefaultContractTemplate();
  // Publicar o cambiar el vigente exige `governance.policies.manage` en el backend.
  const puedeGestionar = useAuth().hasPermission("governance.policies.manage");

  // La vigente y las cifras salen del resumen del servidor: con paginación una página no las sabe.
  const summary = plantillas.data?.summary;
  const vigente = summary?.current ?? null;
  const columns = useMemo(
    () =>
      buildContractColumns({
        onView: setViendo,
        onMarkDefault: puedeGestionar ? setPorDefecto : undefined,
      }),
    [puedeGestionar],
  );
  const hayFiltros = q.trim() !== "" || status !== "";

  return (
    <>
      <PageHeader
        icon={FileSignature}
        eyebrow="Comercios"
        title="Contrato de afiliación"
        description="El texto bajo el que opera un comercio al que nadie le negoció uno propio. Se publica por versiones; el anterior se archiva y se conserva."
      />
      <BusinessContextNote>
        Verificar que un comercio existe no es lo mismo que tener algo firmado
        con él. Sin contrato vigente se habilita a cobrar a alguien con quien no
        se pactó por escrito la comisión, los plazos de liquidación ni qué pasa
        con una devolución. Un contrato negociado con un comercio concreto no se
        fija aquí: es un término comercial y se lleva en el ERP.
      </BusinessContextNote>

      {plantillas.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {plantillas.error ? (
        <ErrorState
          description={
            isAtlasApiError(plantillas.error)
              ? plantillas.error.message
              : "No se pudo leer el contrato de afiliación."
          }
          requestId={
            isAtlasApiError(plantillas.error)
              ? plantillas.error.requestId
              : undefined
          }
          onRetry={() => void plantillas.refetch()}
        />
      ) : null}

      {plantillas.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard
              label="Contrato vigente"
              value={vigente ? `v${vigente.version}` : "Ninguno"}
              hint={vigente?.name ?? "Sin contrato, el Motor lo sabrá"}
              tone={vigente ? "success" : "critical"}
            />
            <MetricCard
              label="Versiones publicadas"
              value={formatNumber(summary?.total ?? 0)}
            />
            <MetricCard
              label="En vigor desde"
              value={
                vigente?.effectiveFrom
                  ? formatDateTime(vigente.effectiveFrom)
                  : "—"
              }
            />
          </section>

          {!vigente ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              No hay contrato de afiliación vigente. La verificación del
              expediente se lo dice al Motor, que puede negarse a habilitar a un
              comercio en lugar de aprobarlo por omisión.
            </p>
          ) : null}

          {puedeGestionar ? (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setPublicando(true)}>
                Publicar una versión
              </Button>
            </div>
          ) : null}

          <FilterBar
            search={q}
            searchPlaceholder="Buscar por código o nombre del contrato…"
            searchTooltip="Busca en el servidor, en todas las versiones: coincide con parte del código o del nombre del contrato."
            filters={[
              {
                name: "status",
                label: "Estado",
                tooltip:
                  "Vigentes son las que pueden regir; archivadas, las que rigieron antes y se conservan como prueba.",
                value: status,
                options: ESTADO_OPTIONS,
              },
            ]}
            onSearchChange={(value) => {
              setQ(value);
              setPage(1);
            }}
            onFilterChange={(name, value) => {
              if (name === "status") setStatus(value);
              setPage(1);
            }}
            onClear={() => {
              setQ("");
              setStatus("");
              setPage(1);
            }}
          />

          <DataTable
            data={plantillas.data.items}
            columns={columns}
            meta={plantillas.data.meta}
            onPageChange={setPage}
            emptyTitle={
              hayFiltros
                ? "Ninguna versión coincide con la búsqueda."
                : "Todavía no se publicó ninguna versión."
            }
            emptyDescription={
              hayFiltros
                ? "Prueba con otro texto o quita el filtro de estado."
                : "Cuando se publique la primera versión del contrato aparecerá aquí."
            }
          />
        </div>
      ) : null}

      <DrawerPanel
        open={viendo !== null}
        title={
          viendo ? `${viendo.name} · v${viendo.version}` : "Texto del contrato"
        }
        onClose={() => setViendo(null)}
      >
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-atlas-muted">
          {viendo?.templateCode}
        </p>
        <pre className="whitespace-pre-wrap rounded-md bg-atlas-soft p-3 text-xs text-atlas-text">
          {viendo?.body}
        </pre>
      </DrawerPanel>

      <DialogoPublicar
        open={publicando}
        codigoSugerido={vigente?.templateCode ?? "AFILIACION"}
        onClose={() => setPublicando(false)}
      />

      <ConfirmDialog
        open={porDefecto !== null}
        title="Marcar como contrato vigente"
        description={`A partir de ahora, los comercios sin contrato negociado se afilian bajo la versión ${porDefecto?.version ?? ""}. El anterior deja de regir, pero se conserva.`}
        confirmText="Marcar"
        isLoading={marcar.isPending}
        onCancel={() => setPorDefecto(null)}
        onConfirm={() => {
          if (!porDefecto) return;
          void marcar
            .mutateAsync(porDefecto.templateId)
            .finally(() => setPorDefecto(null));
        }}
      />
    </>
  );
}
