"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTestSuite } from "@/features/systems/hooks";
import type { TestStep } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { MethodBadge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { SuiteExecutionPanel } from "./suite-execution-panel";

const tabs = ["Resumen", "Pasos", "Config", "Ejecución"];

export function TestSuiteDetailPage({
  suiteId,
}: Readonly<{ suiteId: string }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const suite = useTestSuite(suiteId);

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
              <StatusBadge
                value={suite.data.suite.isEnabled ? "ACTIVE" : "DISABLED"}
              />
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
            <SuiteExecutionPanel suite={suite.data.suite} suiteId={suiteId} />
          ) : null}
        </>
      ) : null}
    </PermissionGate>
  );
}
