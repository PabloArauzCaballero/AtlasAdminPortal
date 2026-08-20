"use client";

import Link from "next/link";
import { ArrowLeft, Layers, Lock, Table2, Users } from "lucide-react";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";
import { useSchemaTable } from "./hooks";
import { splitQualifiedName } from "./schema-table-columns";
import { ColumnsSection, RelationshipsSection } from "./schema-table-sections";

export function SchemaTableDetailPage({
  tableId,
}: Readonly<{ tableId: string }>) {
  const table = useSchemaTable(tableId);
  const data = table.data;
  const name = data ? splitQualifiedName(data.tableName) : null;
  const columns = data?.columns ?? [];
  const piiCount = columns.filter((column) => column.isPii).length;

  return (
    <>
      <PageHeader
        eyebrow={name?.schema ? `Esquema ${name.schema}` : "Esquema de datos"}
        title={name?.table ?? `Tabla #${tableId}`}
        description="Columnas, propiedades de gobierno y claves foráneas registradas para esta tabla."
        actions={
          data ? (
            <Link href={`/internal/schema/versions/${data.schemaVersionId}`}>
              <Button>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Volver al inventario
              </Button>
            </Link>
          ) : null
        }
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

      {data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">
              <Table2 className="h-3 w-3" aria-hidden />
              {data.tableType}
            </Badge>
            {data.isAppendOnly ? (
              <Badge tone="warning">
                <Lock className="h-3 w-3" aria-hidden />
                Append-only: sus filas no se modifican
              </Badge>
            ) : null}
            {data.isTenantScoped ? (
              <Badge tone="info">
                <Users className="h-3 w-3" aria-hidden />
                Acotada por tenant
              </Badge>
            ) : (
              <Badge tone="muted">
                <Layers className="h-3 w-3" aria-hidden />
                Compartida entre tenants
              </Badge>
            )}
            <code className="font-mono text-xs text-atlas-muted">
              {data.tableName}
            </code>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Columnas" value={columns.length} />
            <MetricCard
              label="Columnas con PII"
              value={piiCount}
              hint={piiCount ? "Sujetas a retención y enmascarado" : "Ninguna"}
            />
            <MetricCard
              label="Relaciones"
              value={data.relationships?.length ?? 0}
              hint="Claves foráneas salientes"
            />
            <MetricCard
              label="Indexadas"
              value={columns.filter((column) => column.isIndexed).length}
            />
          </div>

          {data.description ? (
            <p className="rounded-xl border border-atlas-border bg-white p-3 text-sm text-atlas-muted shadow-subtle">
              {safeText(data.description)}
            </p>
          ) : null}

          <ColumnsSection columns={columns} />
          <RelationshipsSection relationships={data.relationships ?? []} />
        </div>
      ) : null}
    </>
  );
}
