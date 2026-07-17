"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isAtlasApiError } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { CatalogItemDetailDrawer } from "./catalog-item-detail-drawer";
import { CatalogVersionActions } from "./catalog-version-actions";
import { buildCatalogVersionItemColumns } from "./catalog-version-items-columns";
import { STATUS_HELP, STATUS_LABELS } from "./catalog-version-lifecycle";
import type { ContextItem } from "./catalog-version-types";
import { useCatalogVersion } from "./hooks";

/**
 * Ficha de una versión de catálogo y su flujo de aprobación.
 *
 * Se entra desde el listado de catálogos: `/operations/catalogs` devuelve en
 * `currentVersion` la versión MÁS RECIENTE (no solo la activa), así que un
 * borrador recién creado es alcanzable desde ahí.
 *
 * El gate usa `operations.catalogs.read`, que es la clave real del catálogo de
 * permisos. No existe una clave de escritura para catálogos: quién puede
 * enviar a aprobación o decidir lo resuelve el backend por rol y devuelve 403
 * si no corresponde. El permiso de lectura solo controla ver la pantalla.
 */
export function CatalogVersionDetailPage(
  props: Readonly<{ catalogCode: string; versionId: string }>,
) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["operations.catalogs.read"]}>
      <AuthorizedCatalogVersionDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedCatalogVersionDetailPage({
  catalogCode,
  versionId,
}: Readonly<{ catalogCode: string; versionId: string }>) {
  const [inspected, setInspected] = useState<ContextItem | null>(null);
  const detail = useCatalogVersion(catalogCode, versionId);
  const columns = useMemo(
    () => buildCatalogVersionItemColumns(setInspected),
    [],
  );

  const version = detail.data?.version;
  const items = detail.data?.items ?? [];
  const aliasCount = items.reduce(
    (total, item) => total + item.aliases.length,
    0,
  );
  const mappingCount = items.reduce(
    (total, item) => total + item.riskMappings.length,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Catálogos"
        title={`Versión ${safeText(version?.versionCode)}`}
        description={`Ciclo de aprobación de una versión de \`${catalogCode}\`. Conectado a \`/operations/catalogs/:catalogCode/versions/:versionId\`.`}
        actions={
          <Link href="/internal/operations/catalogs">
            <Button>Volver a catálogos</Button>
          </Link>
        }
      />

      <BusinessContextNote>
        Una versión de catálogo recorre borrador → aprobación → publicación.
        Solo la versión <span className="font-mono">published</span> alimenta a
        las reglas de negocio: mientras está en borrador o esperando aprobación
        no afecta a producción. Publicar o retirar cambia lo que el motor de
        decisión lee en vivo, por eso cada paso pide una justificación que queda
        en la auditoría.
      </BusinessContextNote>

      {detail.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {detail.error ? (
        <ErrorState
          description={
            isAtlasApiError(detail.error)
              ? detail.error.message
              : "No se pudo cargar la versión del catálogo."
          }
          requestId={
            isAtlasApiError(detail.error) ? detail.error.requestId : undefined
          }
          onRetry={() => void detail.refetch()}
        />
      ) : null}

      {detail.data && version ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Items" value={formatNumber(items.length)} />
            <MetricCard label="Alias" value={formatNumber(aliasCount)} />
            <MetricCard
              label="Mapeos de riesgo"
              value={formatNumber(mappingCount)}
            />
            <MetricCard
              label="Estado"
              value={STATUS_LABELS[version.status] ?? version.status}
              hint={STATUS_HELP[version.status]}
            />
          </section>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeader
                  title="Ficha de la versión"
                  description={STATUS_HELP[version.status]}
                  className="mb-0"
                />
                <StatusBadge value={version.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <KeyValueGrid
                items={[
                  { label: "Catálogo", value: detail.data.catalog.catalogName },
                  {
                    label: "Código de catálogo",
                    value: detail.data.catalog.catalogCode,
                    mono: true,
                  },
                  {
                    label: "Dominio",
                    value: safeText(detail.data.catalog.domain),
                  },
                  {
                    label: "Dueño",
                    value: safeText(detail.data.catalog.ownerTeam),
                  },
                  { label: "Versión", value: version.versionCode, mono: true },
                  {
                    label: "Estado",
                    value: STATUS_LABELS[version.status] ?? version.status,
                  },
                  {
                    label: "Vigente desde",
                    value: formatDateTime(version.validFrom),
                  },
                  {
                    label: "Vigente hasta",
                    value: formatDateTime(version.validUntil),
                  },
                  {
                    label: "Aprobada",
                    value: formatDateTime(version.approvedAt),
                  },
                  { label: "Notas", value: safeText(version.notes) },
                ]}
              />
              <CatalogVersionActions
                catalogCode={catalogCode}
                versionId={versionId}
                versionCode={version.versionCode}
                status={version.status}
                itemCount={items.length}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Items de la versión"
                description="Valores que la versión aporta al motor de decisión. Abre un código para ver atributos, alias y mapeos de riesgo."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                emptyTitle="Esta versión no tiene items."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {inspected ? (
        <CatalogItemDetailDrawer
          item={inspected}
          onClose={() => setInspected(null)}
        />
      ) : null}
    </>
  );
}
