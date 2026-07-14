"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
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
  const [requesterUserId, setRequesterUserId] = useState("");
  const [deciding, setDeciding] = useState<SchemaChangeLog | null>(null);

  const changeLog = useSchemaChangeLog({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    approvalStatus,
    requesterUserId,
  });
  const columns = useMemo(
    () => buildChangeLogColumns((change) => setDeciding(change)),
    [],
  );

  return (
    <>
      <FilterBar
        search={requesterUserId}
        searchPlaceholder="Buscar por ID de solicitante…"
        filters={[
          {
            name: "approvalStatus",
            label: "Estado",
            value: approvalStatus,
            options: statusOptions,
          },
        ]}
        onSearchChange={(value) => {
          setRequesterUserId(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "approvalStatus") setApprovalStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setApprovalStatus("");
          setRequesterUserId("");
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
          emptyTitle="No hay propuestas de cambio para este filtro."
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
