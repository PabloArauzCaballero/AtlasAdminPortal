"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  useRunTestSuiteMutation,
  useTestSuite,
} from "@/features/systems/hooks";
import type { TestStep } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { MethodBadge, StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

const tabs = ["Resumen", "Pasos", "Config", "Ejecución"];

export function TestSuiteDetailPage({
  suiteId,
}: Readonly<{ suiteId: string }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [environment, setEnvironment] = useState("LOCAL");
  const { hasPermission } = useAuth();
  const suite = useTestSuite(suiteId);
  const runMutation = useRunTestSuiteMutation(suiteId);

  const stepColumns = useMemo<ColumnDef<TestStep>[]>(
    () => [
      { header: "#", accessorKey: "stepOrder" },
      { header: "Nombre", accessorKey: "name" },
      {
        header: "Método",
        accessorKey: "method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Ruta",
        accessorKey: "pathTemplate",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.pathTemplate}</span>
        ),
      },
      {
        header: "Endpoint",
        accessorKey: "endpointId",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.endpointId ? `#${row.original.endpointId}` : "—"}
          </span>
        ),
      },
      { header: "Input", accessorKey: "inputMode" },
      {
        header: "Continúa",
        accessorKey: "continueOnFailure",
        cell: ({ row }) => formatBoolean(row.original.continueOnFailure),
      },
      {
        header: "Cleanup",
        accessorKey: "cleanupRequired",
        cell: ({ row }) => formatBoolean(row.original.cleanupRequired),
      },
    ],
    [],
  );

  const canExecuteQa = hasPermission("systems.qa.execute");
  const canRunInProductionReadonly =
    suite.data?.suite.isSafeForProduction &&
    suite.data.suite.environmentScope.includes("PRODUCTION_READONLY");

  function executeSuite() {
    if (!canExecuteQa) return;
    runMutation.mutate(
      { environment, dryRun: true, timeoutMs: 10_000, config: {}, headers: {} },
      { onSuccess: () => setConfirmOpen(false) },
    );
  }

  return (
    <PermissionGate permissions={["systems.qa.read"]}>
      {suite.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {suite.error ? (
        <ErrorState
          description={
            isAtlasApiError(suite.error)
              ? suite.error.message
              : "No se pudo cargar la suite."
          }
          requestId={
            isAtlasApiError(suite.error) ? suite.error.requestId : undefined
          }
          onRetry={() => void suite.refetch()}
        />
      ) : null}
      {suite.data ? (
        <>
          <PageHeader
            eyebrow={`Suite #${suite.data.suite.suiteId}`}
            title={suite.data.suite.name}
            description={
              suite.data.suite.description ??
              "Suite sin descripción documentada."
            }
            actions={
              <>
                <StatusBadge
                  value={suite.data.suite.isEnabled ? "ACTIVE" : "DISABLED"}
                />
                <Button
                  variant="primary"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!suite.data.suite.isEnabled || !canExecuteQa}
                  title={
                    !canExecuteQa
                      ? "Necesitas permiso systems.qa.execute para ejecutar suites."
                      : undefined
                  }
                >
                  Ejecutar dry-run
                </Button>
              </>
            }
          />
          <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          {activeTab === "Resumen" ? (
            <KeyValueGrid
              items={[
                { label: "Código", value: suite.data.suite.code, mono: true },
                { label: "Módulo", value: suite.data.suite.module },
                {
                  label: "Tipo",
                  value: suite.data.suite.suiteType,
                  mono: true,
                },
                {
                  label: "Ambientes",
                  value: suite.data.suite.environmentScope.join(", "),
                },
                {
                  label: "Requiere seed",
                  value: formatBoolean(suite.data.suite.requiresSeedData),
                },
                {
                  label: "Safe production",
                  value: formatBoolean(suite.data.suite.isSafeForProduction),
                },
                {
                  label: "Permiso destructivo",
                  value: formatBoolean(
                    suite.data.suite.requiresDestructivePermission,
                  ),
                },
              ]}
            />
          ) : null}
          {activeTab === "Pasos" ? (
            <DataTable data={suite.data.steps} columns={stepColumns} />
          ) : null}
          {activeTab === "Config" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {suite.data.steps.map((step) => (
                <Card key={step.stepId}>
                  <CardContent>
                    <JsonViewer
                      title={`${step.stepOrder}. ${step.name}`}
                      value={{
                        defaultPayload: step.defaultPayload,
                        assertions: step.assertions,
                        extractors: step.extractors,
                        configSchema: step.configSchema,
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
          {activeTab === "Ejecución" ? (
            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm text-atlas-muted">
                  Las ejecuciones se hacen en dry-run por defecto. Producción
                  solo se habilita si la suite está marcada como segura.
                </p>
                <label className="block text-sm font-medium">
                  Ambiente
                  <select
                    className="mt-1 h-9 rounded-md border border-atlas-border px-3"
                    value={environment}
                    onChange={(event) => setEnvironment(event.target.value)}
                  >
                    <option value="LOCAL">LOCAL</option>
                    <option value="STAGING">STAGING</option>
                    {canRunInProductionReadonly ? (
                      <option value="PRODUCTION_READONLY">
                        PRODUCTION_READONLY
                      </option>
                    ) : null}
                  </select>
                </label>
              </CardContent>
            </Card>
          ) : null}
          <ConfirmDialog
            open={confirmOpen}
            title="Confirmar ejecución QA"
            description={`Se ejecutará la suite en ${environment} con dryRun=true. Esta acción quedará auditada.`}
            confirmText="Ejecutar"
            isLoading={runMutation.isPending}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={executeSuite}
          />
          {runMutation.error ? (
            <div className="mt-4">
              <ErrorState
                description={
                  isAtlasApiError(runMutation.error)
                    ? runMutation.error.message
                    : "No se pudo ejecutar la suite."
                }
                requestId={
                  isAtlasApiError(runMutation.error)
                    ? runMutation.error.requestId
                    : undefined
                }
              />
            </div>
          ) : null}
        </>
      ) : null}
    </PermissionGate>
  );
}
