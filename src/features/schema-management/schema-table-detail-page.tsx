"use client";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge, BooleanBadge, PiiBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";
import { useSchemaTable } from "./hooks";

export function SchemaTableDetailPage({
  tableId,
}: Readonly<{ tableId: string }>) {
  const table = useSchemaTable(tableId);

  return (
    <>
      <PageHeader
        eyebrow="Esquema"
        title={table.data ? table.data.tableName : `Tabla #${tableId}`}
        description="Columnas y relaciones registradas para esta tabla en el catálogo de esquema."
      />
      {table.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {table.error ? (
        <ErrorState
          description={
            isAtlasApiError(table.error)
              ? table.error.message
              : `No se pudo cargar la tabla #${tableId}.`
          }
          requestId={
            isAtlasApiError(table.error) ? table.error.requestId : undefined
          }
          onRetry={() => void table.refetch()}
        />
      ) : null}
      {table.data ? (
        <div className="space-y-6">
          <KeyValueSection
            title="Tabla"
            items={[
              { label: "Nombre", value: table.data.tableName, mono: true },
              { label: "Tipo", value: table.data.tableType },
              { label: "Append-only", value: table.data.isAppendOnly },
              { label: "Multi-tenant", value: table.data.isTenantScoped },
              { label: "Descripción", value: table.data.description },
            ]}
          />
          <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
            <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-3">
              <h2 className="text-sm font-semibold text-atlas-text">
                Columnas ({table.data.columns?.length ?? 0})
              </h2>
            </div>
            <div className="atlas-scrollbar overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Columna</th>
                    <th className="px-4 py-2.5 text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-left">Nullable</th>
                    <th className="px-4 py-2.5 text-left">Inmutable</th>
                    <th className="px-4 py-2.5 text-left">PII</th>
                    <th className="px-4 py-2.5 text-left">Indexada</th>
                    <th className="px-4 py-2.5 text-left">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(table.data.columns ?? []).map((column) => (
                    <tr key={column._id}>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {column.columnName}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {column.columnType}
                      </td>
                      <td className="px-4 py-2.5">
                        <BooleanBadge value={column.isNullable} />
                      </td>
                      <td className="px-4 py-2.5">
                        <BooleanBadge value={column.isImmutable} />
                      </td>
                      <td className="px-4 py-2.5">
                        <PiiBadge value={column.isPii} />
                      </td>
                      <td className="px-4 py-2.5">
                        <BooleanBadge value={column.isIndexed} />
                      </td>
                      <td className="px-4 py-2.5">
                        {safeText(column.description)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
            <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-3">
              <h2 className="text-sm font-semibold text-atlas-text">
                Relaciones ({table.data.relationships?.length ?? 0})
              </h2>
            </div>
            <div className="atlas-scrollbar overflow-auto">
              {(table.data.relationships ?? []).length === 0 ? (
                <p className="p-5 text-sm text-atlas-muted">
                  Sin relaciones (foreign keys) registradas.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Columna origen</th>
                      <th className="px-4 py-2.5 text-left">Tabla destino</th>
                      <th className="px-4 py-2.5 text-left">Columna destino</th>
                      <th className="px-4 py-2.5 text-left">Cascade delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(table.data.relationships ?? []).map((relationship) => (
                      <tr key={relationship._id}>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {relationship.sourceColumnName}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {relationship.targetTableName}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {relationship.targetColumnName}
                        </td>
                        <td className="px-4 py-2.5">
                          {relationship.cascadeDelete ? (
                            <Badge tone="warning">Sí</Badge>
                          ) : (
                            <Badge tone="muted">No</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
