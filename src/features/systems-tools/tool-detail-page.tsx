"use client";

import { useTool } from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function ToolDetailPage({ toolId }: Readonly<{ toolId: string }>) {
  const tool = useTool(toolId);
  return (
    <PermissionGate permissions={["systems.tools.read"]}>
      {tool.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {tool.error ? (
        <ErrorState
          description={
            isAtlasApiError(tool.error)
              ? tool.error.message
              : "No se pudo cargar herramienta."
          }
          requestId={
            isAtlasApiError(tool.error) ? tool.error.requestId : undefined
          }
          onRetry={() => void tool.refetch()}
        />
      ) : null}
      {tool.data ? (
        <>
          <PageHeader
            eyebrow={`Herramienta #${tool.data.toolId}`}
            title={tool.data.name}
            description={
              tool.data.purpose ?? "Herramienta sin propósito documentado."
            }
            actions={<StatusBadge value={tool.data.status} />}
          />
          <div className="space-y-6">
            <KeyValueGrid
              items={[
                { label: "Código", value: tool.data.code, mono: true },
                { label: "Tipo", value: tool.data.type },
                { label: "Proveedor", value: tool.data.provider },
                { label: "Owner", value: tool.data.ownerTeam },
                {
                  label: "Crítica",
                  value: formatBoolean(tool.data.isCritical),
                },
                {
                  label: "Requiere credenciales",
                  value: formatBoolean(tool.data.requiresCredentials),
                },
                {
                  label: "Tiene sandbox",
                  value: formatBoolean(tool.data.hasSandbox),
                },
                {
                  label: "Healthcheck",
                  value: tool.data.healthcheckRoute,
                  mono: true,
                },
              ]}
            />
            <Card>
              <CardContent>
                <JsonViewer
                  title="Variables requeridas sin valores"
                  value={{ requiredEnvVars: tool.data.requiredEnvVars }}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </PermissionGate>
  );
}
