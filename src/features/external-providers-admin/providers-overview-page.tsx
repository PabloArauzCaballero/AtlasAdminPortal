"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useProviderHealth, useProviders } from "./hooks";
import { buildProviderColumns, type ProviderRow } from "./provider-columns";
import { ProviderDetailDrawer } from "./provider-detail-drawer";

export function ProvidersOverviewPage() {
  const providers = useProviders();
  const health = useProviderHealth();
  const [open, setOpen] = useState<ProviderRow | null>(null);

  const rows: ProviderRow[] = useMemo(() => {
    const healthByCode = new Map(
      (health.data ?? []).map((h) => [h.providerCode, h]),
    );
    return (providers.data ?? []).map((provider) => ({
      ...provider,
      health: healthByCode.get(provider.code),
    }));
  }, [providers.data, health.data]);

  const columns = useMemo(
    () => buildProviderColumns((provider) => setOpen(provider)),
    [],
  );
  const isLoading = providers.isLoading || health.isLoading;

  return (
    <>
      <PageHeader
        eyebrow="Proveedores externos"
        title="Proveedores externos"
        description="Catálogo de proveedores de datos externos (KYC, buró de crédito, telco, pagos, redes) con su salud en vivo, modo runtime y políticas de costo."
        actions={
          <>
            <Link href="/internal/external-providers/audits">
              <Button>Auditorías</Button>
            </Link>
            <Link href="/internal/external-providers/requests">
              <Button>Solicitudes</Button>
            </Link>
          </>
        }
      />
      <BusinessContextNote>
        &quot;Gestionar&quot; abre runtime (modo/estado + kill switch),
        políticas de costo y una prueba real contra el proveedor. Reconfigurar
        runtime y editar costos está restringido a{" "}
        <span className="font-mono">admin</span>/
        <span className="font-mono">platform_admin</span> en el backend.
      </BusinessContextNote>
      {isLoading ? <LoadingSkeleton rows={6} /> : null}
      {providers.error ? (
        <ErrorState
          description={
            isAtlasApiError(providers.error)
              ? providers.error.message
              : "No se pudo cargar el catálogo de proveedores."
          }
          requestId={
            isAtlasApiError(providers.error)
              ? providers.error.requestId
              : undefined
          }
          onRetry={() => void providers.refetch()}
        />
      ) : null}
      {!isLoading && rows.length > 0 ? (
        <DataTable
          data={rows}
          columns={columns}
          emptyTitle="No hay proveedores registrados."
        />
      ) : null}
      {open ? (
        // `key` obliga a remontar al cambiar de proveedor: sin él, React reusa
        // la instancia y los formularios internos (runtime, test) conservan el
        // estado del proveedor anterior, con riesgo de guardar su config aquí.
        <ProviderDetailDrawer
          key={open.code}
          provider={open}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
