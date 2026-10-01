"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTools } from "@/features/systems/hooks";
import type { ToolItem } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatBoolean } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import { useAuth } from "@/shared/auth/auth-context";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToolsHealthSection } from "./tools-health-section";
import { isAtlasApiError } from "@/shared/api/errors";
import { Wrench } from "lucide-react";
import { usePageSize } from "@/shared/lib/page-size";

export const TOOLS_READ = "systems.tools.read";
export const TOOLS_HEALTH_READ = "systems.tools.health.read";

/**
 * Los estados del catálogo de herramientas: el CHECK de `system_tool_catalog.status` en la base.
 * Antes las opciones salían de la página cargada y se autorrestringían (un estado que no estaba en
 * la página 1 no se podía elegir).
 */
export const TOOL_STATUS_OPTIONS: Option[] = [
  {
    value: "ACTIVE",
    label: "Activa",
    description: "En uso por la plataforma.",
  },
  {
    value: "PLANNED",
    label: "Planificada",
    description: "Todavía sin integración: no hay nada que probar.",
  },
  {
    value: "DEPRECATED",
    label: "Obsoleta",
    description: "Se va a retirar; no debería usarse en cambios nuevos.",
  },
  {
    value: "DISABLED",
    label: "Desactivada",
    description: "Apagada a propósito: no se llama ni se monitorea.",
  },
];

const TABS = [
  { key: "catalogo", label: "Catálogo", permission: TOOLS_READ },
  { key: "salud", label: "Salud", permission: TOOLS_HEALTH_READ },
] as const;

/**
 * Herramientas con dos pestañas: «Catálogo» (`systems.tools.read`) y «Salud»
 * (`systems.tools.health.read`; antes su propia pantalla, que ahora redirige a `?tab=salud`). Cada
 * pestaña se enseña sólo a quien tiene su permiso; ocultarla no autoriza nada, el servidor manda.
 */
export function ToolsPage() {
  // El gate envuelve a un componente aparte: con los hooks aquí las consultas saldrían antes de
  // que el gate decidiera.
  return (
    <PermissionGate permissions={[TOOLS_READ, TOOLS_HEALTH_READ]}>
      <ToolsTabs />
    </PermissionGate>
  );
}

function ToolsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const visible = TABS.filter((tab) => hasPermission(tab.permission));
  const active =
    visible.find((tab) => tab.key === searchParams.get("tab")) ?? visible[0];
  return (
    <>
      <PageHeader
        icon={Wrench}
        eyebrow="Herramientas"
        title="Herramientas internas"
        description="Servicios técnicos de los que depende la plataforma y si responden ahora mismo. No se muestran valores de variables de entorno ni secretos."
      />
      {visible.length > 1 ? (
        <DetailTabs
          tabs={visible.map((tab) => tab.label)}
          active={active?.label ?? ""}
          onChange={(label) => {
            const key = TABS.find((tab) => tab.label === label)?.key;
            router.replace(
              key === "salud" ? `${pathname}?tab=salud` : pathname,
              { scroll: false },
            );
          }}
        />
      ) : null}
      {active?.key === "catalogo" ? <ToolsCatalog /> : null}
      {active?.key === "salud" ? <ToolsHealthSection /> : null}
    </>
  );
}

function ToolsCatalog() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const tools = useTools({ page, limit: usePageSize(20), q, status });
  const items = useMemo(() => tools.data?.items ?? [], [tools.data?.items]);
  const columns = useMemo<ColumnDef<ToolItem>[]>(
    () => [
      {
        header: "Código",
        accessorKey: "code",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-atlas-accent underline"
            href={`/internal/systems/tools/${row.original.toolId}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { header: "Nombre", accessorKey: "name" },
      { header: "Tipo", accessorKey: "type" },
      { header: "Proveedor", accessorKey: "provider" },
      {
        header: "Crítica",
        accessorKey: "isCritical",
        cell: ({ row }) => formatBoolean(row.original.isCritical),
      },
      {
        header: "Credenciales",
        accessorKey: "requiresCredentials",
        cell: ({ row }) => formatBoolean(row.original.requiresCredentials),
      },
      {
        header: "Sandbox",
        accessorKey: "hasSandbox",
        cell: ({ row }) => formatBoolean(row.original.hasSandbox),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre, proveedor o tipo…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el código, el nombre, el proveedor y el tipo de la herramienta."
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setPage(1);
        }}
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: TOOL_STATUS_OPTIONS,
            tooltip:
              "Estado de la herramienta en el catálogo; no dice si responde (eso está en Salud).",
          },
        ]}
      />
      {tools.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {tools.error ? (
        <ErrorState
          description={
            isAtlasApiError(tools.error)
              ? tools.error.message
              : "No se pudieron cargar las herramientas."
          }
          requestId={
            isAtlasApiError(tools.error) ? tools.error.requestId : undefined
          }
          onRetry={() => void tools.refetch()}
        />
      ) : null}
      {tools.data ? (
        <DataTable
          data={items}
          columns={columns}
          meta={tools.data.meta}
          onPageChange={setPage}
          emptyTitle="Ninguna herramienta cumple estos filtros"
          emptyDescription="Quita el filtro de estado o cambia la búsqueda."
        />
      ) : null}
    </>
  );
}
