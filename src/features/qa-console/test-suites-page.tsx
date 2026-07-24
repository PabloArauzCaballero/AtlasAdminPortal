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
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { TutorialLaunchButton } from "@/features/qa-tutorials/tutorial-launch-button";
import { useTutorial } from "@/features/qa-tutorials/tutorial-provider";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatBoolean } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { isAtlasApiError } from "@/shared/api/errors";

export function TestSuitesPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.qa.read"]}>
      <AuthorizedTestSuitesPage />
    </PermissionGate>
  );
}

function AuthorizedTestSuitesPage() {
  const router = useRouter();
  const { start } = useTutorial();
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
            className="font-mono text-xs font-semibold text-blue-700 underline"
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
    <>
      <PageHeader
        title="Suites QA registradas en backend"
        description="Suites de prueba registradas en `/systems/test-suites`. ¿Quieres ejecutar requests directos contra otra URL?"
        actions={
          <div className="flex gap-2">
            <TutorialLaunchButton tutorialId="qa-suites-list" />
            {/* El backend restringe la autoría a system_admin/platform_admin/
                qa_engineer; no existe un permiso "systems.qa.manage" en el
                catálogo, así que se usa el de ejecución y el backend responde
                403 si el rol no alcanza. */}
            <PermissionGate
              permissions={["systems.qa.execute"]}
              fallback={null}
            >
              <Button
                variant="primary"
                data-tutorial-id="qa-suites-new"
                onClick={() => setCreating(true)}
              >
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
        <div data-tutorial-id="qa-suite-form">
          <SuiteForm
            onSaved={(saved) => {
              setCreating(false);
              router.push(`/internal/qa/suites/${saved.suite.suiteId}`);
            }}
          />
        </div>
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
      {suites.data && items.length === 0 ? (
        <EmptyState
          title="Todavía no hay suites de prueba"
          description="Una suite te permite agrupar varios casos y ejecutarlos juntos. Por ejemplo, una suite «Inicio de sesión» con pruebas para acceso correcto, contraseña incorrecta y recuperación de cuenta — así verificas toda una funcionalidad antes de publicarla."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <PermissionGate
                permissions={["systems.qa.execute"]}
                fallback={null}
              >
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Crear primera suite
                </Button>
              </PermissionGate>
              <Button onClick={() => start("qa-suites-list")}>
                Ver tutorial
              </Button>
            </div>
          }
        />
      ) : null}
      {suites.data && items.length > 0 ? (
        <div data-tutorial-id="qa-suites-table">
          <DataTable
            data={items}
            columns={columns}
            meta={suites.data.meta}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </>
  );
}
