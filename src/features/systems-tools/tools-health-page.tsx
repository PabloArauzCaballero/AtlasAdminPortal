"use client";

import { RefreshCw } from "lucide-react";
import { useToolsHealth } from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function ToolsHealthPage() {
  const health = useToolsHealth();
  return (
    <PermissionGate permissions={["systems.tools.health.read"]}>
      <PageHeader
        title="Salud de herramientas"
        description="Estado reportado por `/systems/health/tools`. Las variables faltantes se listan sin exponer secretos."
        actions={
          <Button onClick={() => void health.refetch()}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      {health.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {health.error ? (
        <ErrorState
          description={
            isAtlasApiError(health.error)
              ? health.error.message
              : "No se pudo cargar health de herramientas."
          }
          requestId={
            isAtlasApiError(health.error) ? health.error.requestId : undefined
          }
          onRetry={() => void health.refetch()}
        />
      ) : null}
      {health.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {health.data.map((tool, index) => (
            <Card key={`${tool.code ?? tool.name ?? index}`}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {safeText(tool.name ?? tool.code)}
                    </p>
                    <p className="truncate font-mono text-xs text-atlas-muted">
                      {safeText(tool.code)}
                    </p>
                  </div>
                  <StatusBadge value={tool.status} />
                </div>
                <p className="text-xs text-atlas-muted">
                  Crítica: {tool.isCritical ? "sí" : "no"}
                </p>
                {"missingEnvVars" in tool &&
                Array.isArray(tool.missingEnvVars) ? (
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-atlas-muted">
                      Variables faltantes
                    </p>
                    <p className="mt-1 break-words font-mono text-xs">
                      {tool.missingEnvVars.length > 0
                        ? tool.missingEnvVars.join(", ")
                        : "—"}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </PermissionGate>
  );
}
