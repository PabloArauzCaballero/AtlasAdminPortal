"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useAuthBrokerAvailability,
  useProviderAuthStates,
  useProviderHealth,
  useProviders,
} from "./hooks";
import { ProvidersDashboard } from "./dashboard/providers-dashboard";
import { buildProviderColumns, type ProviderRow } from "./provider-columns";
import { ProviderDetailDrawer } from "./provider-detail-drawer";
import { Inbox, KeyRound, Plug, ScrollText, TriangleAlert } from "lucide-react";

/**
 * Aviso sobre la delegación de autenticación.
 *
 * Distingue tres situaciones que no deben verse igual: no delegada todavía (informativo),
 * delegada pero el worker no responde (incidente real: las llamadas que exijan credencial van a
 * fallar) y funcionando (sin aviso, para no añadir ruido permanente al panel).
 */
function AuthBrokerNotice({
  configured,
  reachable,
}: Readonly<{ configured?: boolean; reachable?: boolean }>) {
  if (configured === undefined) return null;
  if (!configured) {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-atlas-muted">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          La autenticación con proveedores aún no está delegada en el{" "}
          <span className="font-mono">atlas-auth-broker-worker</span>; las
          columnas &quot;Credencial&quot; y &quot;Token&quot; aparecerán vacías.
        </span>
      </div>
    );
  }
  if (!reachable) {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          El broker de autenticación no responde. Las llamadas a proveedores que
          exijan credencial fallarán mientras dure la incidencia.
        </span>
      </div>
    );
  }
  return null;
}

export function ProvidersOverviewPage() {
  const providers = useProviders();
  const health = useProviderHealth();
  const authBroker = useAuthBrokerAvailability();
  const authStates = useProviderAuthStates(
    authBroker.data?.configured === true,
  );
  const [open, setOpen] = useState<ProviderRow | null>(null);

  const rows: ProviderRow[] = useMemo(() => {
    const healthByCode = new Map(
      (health.data ?? []).map((h) => [h.providerCode, h]),
    );
    const authByCode = new Map(
      (authStates.data ?? []).map((state) => [state.providerCode, state]),
    );
    return (providers.data ?? []).map((provider) => ({
      ...provider,
      health: healthByCode.get(provider.code),
      authState: authByCode.get(provider.code),
    }));
  }, [providers.data, health.data, authStates.data]);

  const columns = useMemo(
    () => buildProviderColumns((provider) => setOpen(provider)),
    [],
  );
  const isLoading = providers.isLoading || health.isLoading;

  return (
    <>
      <PageHeader
        icon={Plug}
        eyebrow="Proveedores externos"
        title="Proveedores externos"
        description="Actividad y salud de los proveedores de datos externos (KYC, buró de crédito, telco, pagos, redes), y el catálogo con su modo de llamada y políticas de costo."
        actions={
          <>
            <Link href="/internal/external-providers/audits">
              <Button>
                <ScrollText className="h-4 w-4" aria-hidden />
                Auditorías
              </Button>
            </Link>
            <Link href="/internal/external-providers/requests">
              <Button>
                <Inbox className="h-4 w-4" aria-hidden />
                Solicitudes
              </Button>
            </Link>
          </>
        }
      />
      <BusinessContextNote>
        &quot;Gestionar&quot; abre runtime (modo/estado + kill switch),
        políticas de costo y una prueba real contra el proveedor. Reconfigurar
        runtime y editar costos está restringido a{" "}
        <span className="font-mono">admin</span>/
        <span className="font-mono">platform_admin</span> en el backend. Las
        columnas &quot;Credencial&quot; y &quot;Token&quot; vienen del{" "}
        <span className="font-mono">atlas-auth-broker-worker</span>: describen
        nuestra autenticación ante el proveedor, no la salud del proveedor.
      </BusinessContextNote>
      <AuthBrokerNotice
        configured={authBroker.data?.configured}
        reachable={authBroker.data?.reachable}
      />
      {/*
       * El tablero va PRIMERO. Contesta con qué se entra a esta pantalla —¿responden?, ¿cuánto
       * tardan?, ¿cuántas llamadas hubo, cuántas fallaron y cuánto costaron?—; la tabla de abajo
       * contesta la pregunta siguiente, que es cómo está configurado cada proveedor.
       */}
      <ProvidersDashboard />
      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        Catálogo y configuración
      </h2>
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
