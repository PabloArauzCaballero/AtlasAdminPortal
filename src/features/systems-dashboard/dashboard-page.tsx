"use client";

import Link from "next/link";
import {
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
import { useDashboard, useToolsHealth } from "@/features/systems/hooks";
import { ToolLiveBadge } from "@/features/systems/tool-live-state";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { humanizeKey, objectEntries, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { TrafficLatencySection } from "./traffic-latency-section";

export function DashboardPage() {
  const dashboard = useDashboard();
  const toolsHealth = useToolsHealth();
  const error = dashboard.error ?? toolsHealth.error;

  return (
    <PermissionGate permissions={["systems.dashboard.read"]}>
      <PageHeader
        eyebrow="Panel de sistemas"
        title="Centro interno ATLAS"
        description="Estado operativo de Systems Ops, catálogo, QA, gobierno, lineage y auditoría conectado al servicio interno real."
        actions={
          <Button
            onClick={() => {
              void dashboard.refetch();
              void toolsHealth.refetch();
            }}
            isLoading={dashboard.isFetching || toolsHealth.isFetching}
            loadingText="Actualizando…"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      {dashboard.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar el dashboard."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void dashboard.refetch();
            void toolsHealth.refetch();
          }}
        />
      ) : null}

      {dashboard.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {objectEntries(dashboard.data.counts).map(([key, value]) => (
              <MetricCard key={key} label={humanizeKey(key)} value={value} />
            ))}
          </section>

          <TrafficLatencySection />

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Postura del catálogo"
                  description="Información enviada por `/systems/dashboard`."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {objectEntries(dashboard.data.posture).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-md border border-atlas-border p-3"
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

            <Card>
              <CardHeader>
                <SectionHeader
                  title="Herramientas críticas"
                  description="Salud reportada por `/systems/health/tools`."
                  className="mb-0"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {toolsHealth.isLoading ? <LoadingSkeleton rows={3} /> : null}
                {(toolsHealth.data ?? []).length === 0 &&
                !toolsHealth.isLoading ? (
                  <p className="text-sm text-atlas-muted">
                    No hay health checks de herramientas disponibles.
                  </p>
                ) : null}
                {(toolsHealth.data ?? []).map((tool, index) => (
                  <div
                    key={`${tool.code ?? tool.name ?? index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-atlas-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-atlas-text">
                        {safeText(tool.name ?? tool.code)}
                      </p>
                      <p className="truncate text-xs text-atlas-muted">
                        {safeText(tool.code)}
                      </p>
                    </div>
                    <ToolLiveBadge tool={tool} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Accesos rápidos"
                description="Navegación hacia módulos reales del portal interno."
                className="mb-0"
              />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAccessLink
                icon={GitBranch}
                href="/internal/systems/endpoints"
                label="Ver endpoints"
              />
              <QuickAccessLink
                icon={Database}
                href="/internal/data-catalog/tables"
                label="Ver catálogo de datos"
              />
              <QuickAccessLink
                icon={FolderTree}
                href="/internal/lineage"
                label="Ver lineage"
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
                label="Readiness Release"
              />
              <QuickAccessLink
                icon={TestTube2}
                href="/internal/qa/suites"
                label="Ver suites QA"
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
    </PermissionGate>
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
      className="group flex items-center gap-3 rounded-xl border border-atlas-border p-4 text-sm font-medium text-atlas-text transition-all duration-150 hover:-translate-y-0.5 hover:border-atlas-accent/40 hover:bg-atlas-accentSoft hover:shadow-card"
      href={href}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-atlas-soft text-atlas-accent transition-colors group-hover:bg-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-atlas-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
