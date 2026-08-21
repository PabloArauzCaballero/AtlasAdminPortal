"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePlatformBlocks, useDataEntities } from "@/features/systems/hooks";
import type { DataEntity } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  BlockBadge,
  ModuleBadge,
  PiiBadge,
  ReviewStatusBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatBoolean } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { Database } from "lucide-react";

const reviewOptions = [
  { label: "Auto detectado", value: "AUTO_DETECTED" },
  { label: "Necesita revisión", value: "NEEDS_REVIEW" },
  { label: "Aprobado", value: "APPROVED" },
  { label: "Rechazado", value: "REJECTED" },
];

export function DataEntitiesPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["catalog.data.read"]}>
      <AuthorizedDataEntitiesPage />
    </PermissionGate>
  );
}

function AuthorizedDataEntitiesPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(initialQ);
  const [reviewStatus, setReviewStatus] = useState("");
  // El bloque puede venir en la URL para que un enlace desde «Salud de la red» abra el catálogo ya
  // acotado al producto que se estaba investigando, sin obligar a repetir el filtro a mano.
  const [block, setBlock] = useState(searchParams.get("block") ?? "");
  const blocks = usePlatformBlocks();
  const entities = useDataEntities({ page, limit: 20, q, reviewStatus, block });

  const blockOptions = useMemo(
    () =>
      (blocks.data ?? []).map((item) => ({
        // El contador va en la etiqueta a propósito: es lo que delata de un vistazo que un bloque
        // no está aportando nada, que es justo lo que el catálogo no dejaba ver.
        label: `${item.name} (${item.dataEntities})`,
        value: item.systemCode,
      })),
    [blocks.data],
  );

  const columns = useMemo<ColumnDef<DataEntity>[]>(
    () => [
      {
        header: "Bloque",
        accessorKey: "systemCode",
        cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
      },
      {
        header: "Schema",
        accessorKey: "schemaName",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.schemaName}</span>
        ),
      },
      {
        header: "Tabla",
        accessorKey: "tableName",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-atlas-accent underline"
            href={`/internal/data-catalog/tables/${row.original.entityId}`}
          >
            {row.original.tableName}
          </Link>
        ),
      },
      {
        header: "Entidad",
        accessorKey: "entityName",
        cell: ({ row }) => row.original.entityName ?? "—",
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Owner",
        accessorKey: "dataOwner",
        cell: ({ row }) => row.original.dataOwner ?? "—",
      },
      {
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Financiera",
        accessorKey: "containsFinancialData",
        cell: ({ row }) => formatBoolean(row.original.containsFinancialData),
      },
      {
        header: "Riesgo",
        accessorKey: "containsRiskData",
        cell: ({ row }) => formatBoolean(row.original.containsRiskData),
      },
      {
        header: "Audit critical",
        accessorKey: "isAuditCritical",
        cell: ({ row }) => formatBoolean(row.original.isAuditCritical),
      },
      {
        header: "Retención",
        accessorKey: "retentionPolicyCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.retentionPolicyCode ?? "—"}
          </span>
        ),
      },
      {
        header: "Review",
        accessorKey: "reviewStatus",
        cell: ({ row }) => (
          <ReviewStatusBadge value={row.original.reviewStatus} />
        ),
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
      <PageHeader
        icon={Database}
        title="Catálogo de datos"
        description="Tablas y entidades de LOS TRES bloques del ecosistema, desde `/systems/data-entities`."
      />
      <BusinessContextNote>
        Cada fila es una tabla real de la base de datos. Este catálogo existe
        para que soporte, auditoría y nuevos desarrolladores sepan qué significa
        cada tabla, quién es responsable de ella y si contiene datos sensibles
        (PII, financieros, de riesgo) — sin tener que leer el código fuente para
        averiguarlo. El filtro <strong>Bloque</strong> separa las tablas de
        Atlas Backend, del motor de decisión y del ERP: hasta que existió, esta
        pantalla sólo mostraba las del primero sin decirlo en ninguna parte.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar tabla, esquema, entidad, módulo u owner…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "reviewStatus") setReviewStatus(value);
          if (name === "block") setBlock(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setReviewStatus("");
          setBlock("");
          setPage(1);
        }}
        filters={[
          {
            name: "block",
            label: "Bloque",
            value: block,
            options: blockOptions,
          },
          {
            name: "reviewStatus",
            label: "Revisión",
            value: reviewStatus,
            options: reviewOptions,
          },
        ]}
      />
      {entities.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {entities.error ? (
        <ErrorState
          description={
            isAtlasApiError(entities.error)
              ? entities.error.message
              : "No se pudo cargar el catálogo de datos."
          }
          requestId={
            isAtlasApiError(entities.error)
              ? entities.error.requestId
              : undefined
          }
          onRetry={() => void entities.refetch()}
        />
      ) : null}
      {entities.data ? (
        <DataTable
          data={entities.data.items}
          columns={columns}
          meta={entities.data.meta}
          onPageChange={setPage}
        />
      ) : null}
    </>
  );
}
