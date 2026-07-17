"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTestSuites } from "@/features/systems/hooks";
import type { TestSuite } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { SuiteForm } from "./suite-form";
import { ModuleBadge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatBoolean } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { isAtlasApiError } from "@/shared/api/errors";

export function TestSuitesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("");
  const [suiteType, setSuiteType] = useState("");
  const [creating, setCreating] = useState(false);
  const suites = useTestSuites({ page, limit: 20, module, suiteType });
  const items = useMemo(() => suites.data?.items ?? [], [suites.data?.items]);
  const suiteTypeOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.suiteType)),
    [items],
  );

  const columns = useMemo<ColumnDef<TestSuite>[]>(
    () => [
      {
        header: "Código",
        accessorKey: "code",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-blue-700 hover:underline"
            href={`/internal/qa/suites/${row.original.suiteId}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { header: "Nombre", accessorKey: "name" },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Tipo",
        accessorKey: "suiteType",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.suiteType}</span>
        ),
      },
      {
        header: "Ambientes",
        accessorKey: "environmentScope",
        cell: ({ row }) => (
          <span className="text-xs">
            {Array.isArray(row.original.environmentScope)
              ? row.original.environmentScope.join(", ")
              : "—"}
          </span>
        ),
      },
      {
        header: "Activa",
        accessorKey: "isEnabled",
        cell: ({ row }) => (
          <StatusBadge value={row.original.isEnabled ? "ACTIVE" : "DISABLED"} />
        ),
      },
      {
        header: "Seed",
        accessorKey: "requiresSeedData",
        cell: ({ row }) => formatBoolean(row.original.requiresSeedData),
      },
      {
        header: "Prod safe",
        accessorKey: "isSafeForProduction",
        cell: ({ row }) => formatBoolean(row.original.isSafeForProduction),
      },
      {
        header: "Destructiva",
        accessorKey: "requiresDestructivePermission",
        cell: ({ row }) =>
          formatBoolean(row.original.requiresDestructivePermission),
      },
    ],
    [],
  );

  return (
    <PermissionGate permissions={["systems.qa.read"]}>
      <PageHeader
        title="Suites QA registradas en backend"
        description="Suites de prueba registradas en `/systems/test-suites`. ¿Quieres ejecutar requests directos contra otra URL?"
        actions={
          <div className="flex gap-2">
            {/* El backend restringe la autoría a system_admin/platform_admin/
                qa_engineer; no existe un permiso "systems.qa.manage" en el
                catálogo, así que se usa el de ejecución y el backend responde
                403 si el rol no alcanza. */}
            <PermissionGate
              permissions={["systems.qa.execute"]}
              fallback={null}
            >
              <Button variant="primary" onClick={() => setCreating(true)}>
                Nueva suite
              </Button>
            </PermissionGate>
            <Link href="/internal/qa/lab">
              <Button>Abrir QA Live Lab</Button>
            </Link>
          </div>
        }
      />
      <DrawerPanel
        open={creating}
        title="Nueva suite de QA"
        onClose={() => setCreating(false)}
      >
        <SuiteForm
          onSaved={(saved) => {
            setCreating(false);
            router.push(`/internal/qa/suites/${saved.suite.suiteId}`);
          }}
        />
      </DrawerPanel>
      <BusinessContextNote>
        Antes de liberar un cambio, alguien necesita saber si los flujos
        críticos del negocio (onboarding, sesiones, riesgo) siguen funcionando
        de punta a punta. Estas suites son pruebas pre-registradas y repetibles
        para eso: existen para dar confianza de que un release no rompió algo
        que el equipo ya no recuerda probar a mano.
      </BusinessContextNote>
      <FilterBar
        search={module}
        searchPlaceholder="Filtrar por módulo…"
        onSearchChange={(value) => {
          setModule(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "suiteType") setSuiteType(value);
          setPage(1);
        }}
        onClear={() => {
          setModule("");
          setSuiteType("");
          setPage(1);
        }}
        filters={[
          {
            name: "suiteType",
            label: "Tipo de suite",
            value: suiteType,
            options: suiteTypeOptions,
          },
        ]}
      />
      {suites.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {suites.error ? (
        <ErrorState
          description={
            isAtlasApiError(suites.error)
              ? suites.error.message
              : "No se pudo cargar suites QA."
          }
          requestId={
            isAtlasApiError(suites.error) ? suites.error.requestId : undefined
          }
          onRetry={() => void suites.refetch()}
        />
      ) : null}
      {suites.data ? (
        <DataTable
          data={items}
          columns={columns}
          meta={suites.data.meta}
          onPageChange={setPage}
        />
      ) : null}
    </PermissionGate>
  );
}
