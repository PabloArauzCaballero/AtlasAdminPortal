"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { SCHEMA_APPROVE_PERMISSION } from "./change-actor";
import { ApproveChangeDialog } from "./approve-change-dialog";
import { buildChangeLogColumns } from "./change-log-columns";
import { useSchemaChangeLog } from "./hooks";
import type { SchemaChangeLog } from "./types";

const statusOptions = [
  { label: "Pendiente", value: "pending" },
  { label: "Aprobado", value: "approved" },
  { label: "Rechazado", value: "rejected" },
];

export function SchemaChangeLogTable({
  pageSize = 50,
}: Readonly<{ pageSize?: number }>) {
  const [page, setPage] = useState(1);
  const [approvalStatus, setApprovalStatus] = useState("");
  const [q, setQ] = useState("");
  const [deciding, setDeciding] = useState<SchemaChangeLog | null>(null);
  const { hasPermission } = useAuth();
  const canApprove = hasPermission(SCHEMA_APPROVE_PERMISSION);

  const changeLog = useSchemaChangeLog({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    ...(approvalStatus ? { approvalStatus } : {}),
    // Vacío no viaja: el esquema del servidor es estricto y rechaza `q=`.
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  const columns = useMemo(
    () => buildChangeLogColumns((change) => setDeciding(change), canApprove),
    [canApprove],
  );

  return (
    <>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por tabla propuesta o tipo de cambio…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el tipo de cambio, el tipo de objeto afectado, la tabla propuesta y las notas de aprobación."
        filters={[
          {
            name: "approvalStatus",
            label: "Estado",
            value: approvalStatus,
            options: statusOptions,
            tooltip:
              "En qué punto de la aprobación de cuatro ojos está la propuesta.",
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "approvalStatus") setApprovalStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setApprovalStatus("");
          setQ("");
          setPage(1);
        }}
      />
      {changeLog.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {changeLog.error ? (
        <ErrorState
          description={
            isAtlasApiError(changeLog.error)
              ? changeLog.error.message
              : "No se pudo cargar el change log."
          }
          requestId={
            isAtlasApiError(changeLog.error)
              ? changeLog.error.requestId
              : undefined
          }
          onRetry={() => void changeLog.refetch()}
        />
      ) : null}
      {changeLog.data ? (
        <DataTable
          data={changeLog.data.items}
          columns={columns}
          meta={changeLog.data.meta}
          onPageChange={setPage}
          emptyTitle={
            q.trim()
              ? "Ninguna propuesta coincide con la búsqueda."
              : "No hay propuestas de cambio para este filtro."
          }
        />
      ) : null}
      {deciding ? (
        <ApproveChangeDialog
          change={deciding}
          onClose={() => setDeciding(null)}
        />
      ) : null}
    </>
  );
}
