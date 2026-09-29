"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Database,
  FileCheck2,
  FolderTree,
  GitBranch,
  RefreshCw,
  ScrollText,
  Shield,
  TestTube2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "@/features/systems/hooks";
import { queryKeys } from "@/shared/api/query-keys";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { cn } from "@/shared/lib/cn";
import { humanizeKey, objectEntries, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  CriticalToolsBanner,
  CriticalToolsCard,
  TOOLS_HEALTH_PERMISSION,
} from "./critical-tools";
import { TrafficLatencySection } from "./traffic-latency-section";

export function DashboardPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.dashboard.read"]}>
      <AuthorizedDashboardPage />
    </PermissionGate>
  );
}

/**
 * Inicio absorbió «Panel de control» (2026-09-29): los dos leían los mismos contadores. Lo único que
 * aportaba el panel —el aviso rojo de herramientas críticas caídas— vive aquí, pero sólo para quien
 * tiene `systems.tools.health.read`, el permiso que pedía «Salud herramientas». Inicio lo abren
 * también roles de negocio con `systems.dashboard.read` (dirección, jefatura de operaciones): a ellos
 * no se les pide ni se les enseña la salud técnica.
 */
function AuthorizedDashboardPage() {
  const dashboard = useDashboard();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canSeeHealth = hasPermission(TOOLS_HEALTH_PERMISSION);
  const error = dashboard.error;

  return (
    <>
      <PageHeader
        icon={Activity}
        eyebrow="Inicio"
        title="Centro interno ATLAS"
        description="Cómo está la plataforma ahora: catálogo, revisiones pendientes, pruebas, tráfico y, si tienes permiso, la salud de las herramientas."
        actions={
          <Button
            onClick={() => {
              void dashboard.refetch();
              if (canSeeHealth)
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.toolsHealth,
                });
            }}
            isLoading={dashboard.isFetching}
            loadingText="Actualizando…"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      {canSeeHealth ? <CriticalToolsBanner /> : null}
      {dashboard.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar el resumen."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => void dashboard.refetch()}
        />
      ) : null}

      {dashboard.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {objectEntries(dashboard.data.counts).map(([key, value]) => (
              <MetricCard key={key} label={humanizeKey(key)} value={value} />
            ))}
          </section>

          <TrafficLatencySection />

          <div
            className={cn(
              "grid gap-6 grid-cols-1",
              canSeeHealth && "xl:grid-cols-[1.2fr_0.8fr]",
            )}
          >
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Postura del catálogo"
                  description="Si el catálogo está listo para revisar y cuánto queda pendiente."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {objectEntries(dashboard.data.posture).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-atlas-border bg-[#FAFAFB] p-3"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
                        {humanizeKey(key)}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-atlas-text">
                        {safeText(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {canSeeHealth ? <CriticalToolsCard /> : null}
          </div>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Accesos rápidos"
                description="Navegación hacia módulos reales del portal interno."
                className="mb-0"
              />
            </CardHeader>
            <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAccessLink
                icon={GitBranch}
                href="/internal/systems/endpoints"
                label="Ver operaciones"
              />
              <QuickAccessLink
                icon={Database}
                href="/internal/data-catalog/tables"
                label="Ver catálogo de datos"
              />
              <QuickAccessLink
                icon={FolderTree}
                href="/internal/lineage"
                label="Ver linaje"
              />
              <QuickAccessLink
                icon={Shield}
                href="/internal/governance"
                label="Ver gobierno"
              />
              <QuickAccessLink
                icon={FolderTree}
                href="/internal/business-metadata/domains"
                label="Ver dominios"
              />
              <QuickAccessLink
                icon={FileCheck2}
                href="/internal/release-readiness"
                label="Preparación de salida"
              />
              <QuickAccessLink
                icon={TestTube2}
                href="/internal/qa/suites"
                label="Ver baterías de prueba"
              />
              <QuickAccessLink
                icon={ScrollText}
                href="/internal/audit"
                label="Ver auditoría"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function QuickAccessLink({
  icon: Icon,
  href,
  label,
}: Readonly<{
  icon: typeof RefreshCw;
  href: string;
  label: string;
}>) {
  return (
    <Link
      className="group flex items-center gap-3 rounded-lg border border-atlas-border p-3 text-sm font-medium text-atlas-text transition-[background-color,border-color,box-shadow] duration-150 hover:border-slate-300 hover:bg-atlas-soft hover:shadow-subtle"
      href={href}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-atlas-soft text-atlas-accent transition-colors duration-150 group-hover:bg-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-atlas-muted/70 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}
