"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Columns3,
  Database,
  GitBranch,
  History,
  Layers,
  Table2,
} from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { useSchemaNames, useSchemaTables, useSchemaVersion } from "./hooks";
import { buildSchemaTableColumns } from "./schema-table-columns";
import { SchemaPicker } from "./schema-picker";

const PAGE_SIZE = 50;

/**
 * La versión abierta: primero SUS ESQUEMAS, y dentro de cada uno sus tablas.
 *
 * Antes esta pantalla lanzaba directamente una tabla plana con las 152 filas del catálogo paginadas
 * de cincuenta en cincuenta, sin decir en ningún sitio a qué esquema pertenecía cada una — el
 * nombre cualificado ni siquiera existía entonces. Se entra por el esquema porque es como está
 * organizado el modelo de datos y como se piensa al buscar: «las tablas de riesgo», no «la página
 * tres».
 */
export function SchemaVersionDetailPage({
  versionId,
}: Readonly<{ versionId: string }>) {
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const version = useSchemaVersion(versionId);
  const schemas = useSchemaNames(versionId);
  const tables = useSchemaTables({
    versionId,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...(schemaName ? { schemaName } : {}),
  });
  const columns = useMemo(() => buildSchemaTableColumns(), []);

  // Cambiar de esquema reinicia la paginación: quedarse en la página 3 al saltar a un esquema de
  // seis tablas devolvía una lista vacía que se leía como «este esquema no tiene tablas».
  useEffect(() => setPage(1), [schemaName]);

  return (
    <>
      <PageHeader
        eyebrow="Esquema de datos"
        title={version.data?.versionCode ?? `Versión #${versionId}`}
        description="Inventario DDL de la versión: se elige un esquema de datos y se abre cualquiera de sus tablas para ver sus columnas y relaciones."
        actions={
          <>
            <Link href="/internal/schema/versions">
              <Button>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Versiones
              </Button>
            </Link>
            <Link href="/internal/schema/change-log">
              <Button>
                <History className="h-4 w-4" aria-hidden />
                Change log
              </Button>
            </Link>
          </>
        }
      />

      {version.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {version.error ? (
        <ErrorState
          description={
            isAtlasApiError(version.error)
              ? version.error.message
              : `No se pudo cargar la versión #${versionId}.`
          }
          requestId={
            isAtlasApiError(version.error) ? version.error.requestId : undefined
          }
          onRetry={() => void version.refetch()}
        />
      ) : null}

      {version.data ? (
        <section className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={version.data.isActive ? "success" : "muted"} dot>
              {version.data.isActive ? "Versión activa" : "Versión inactiva"}
            </Badge>
            {version.data.parentVersionId ? (
              <Badge tone="info">
                <GitBranch className="h-3 w-3" aria-hidden />
                Deriva de #{version.data.parentVersionId}
              </Badge>
            ) : (
              <Badge tone="muted">
                <GitBranch className="h-3 w-3" aria-hidden />
                Versión raíz
              </Badge>
            )}
            <span className="text-xs text-atlas-muted">
              Creada {formatDateTime(version.data.createdAt)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Esquemas"
              value={schemas.data?.length ?? 0}
              hint="Espacios de nombres de Postgres"
            />
            <MetricCard label="Tablas" value={version.data.tablesCount} />
            <MetricCard label="Columnas" value={version.data.columnsCount} />
            <MetricCard
              label="Relaciones"
              value={version.data.relationshipsCount}
              hint="Claves foráneas, inmutables por diseño"
            />
          </div>
          {version.data.notes ? (
            <p className="rounded-xl border border-atlas-border bg-white p-3 text-sm text-atlas-muted shadow-subtle">
              {safeText(version.data.notes)}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-atlas-text">
          <Layers className="h-4 w-4 text-atlas-accent" aria-hidden />
          Esquemas de datos
        </h2>
        {schemas.isLoading ? <LoadingSkeleton rows={3} /> : null}
        {schemas.error ? (
          <ErrorState
            description={
              isAtlasApiError(schemas.error)
                ? schemas.error.message
                : "No se pudieron cargar los esquemas de esta versión."
            }
            onRetry={() => void schemas.refetch()}
          />
        ) : null}
        {schemas.data ? (
          <SchemaPicker
            schemas={schemas.data}
            selected={schemaName}
            onSelect={setSchemaName}
          />
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-atlas-text">
          <Table2 className="h-4 w-4 text-atlas-accent" aria-hidden />
          {schemaName ? (
            <>
              Tablas de <code className="font-mono">{schemaName}</code>
            </>
          ) : (
            "Todas las tablas de la versión"
          )}
          <Columns3 className="ml-1 h-3.5 w-3.5 text-atlas-muted" aria-hidden />
          <span className="text-xs font-normal text-atlas-muted">
            Abre una tabla para ver sus columnas y sus claves foráneas.
          </span>
        </h2>
        {tables.isLoading ? <LoadingSkeleton rows={6} /> : null}
        {tables.error ? (
          <ErrorState
            description={
              isAtlasApiError(tables.error)
                ? tables.error.message
                : "No se pudieron cargar las tablas de esta versión."
            }
            requestId={
              isAtlasApiError(tables.error) ? tables.error.requestId : undefined
            }
            onRetry={() => void tables.refetch()}
          />
        ) : null}
        {tables.data ? (
          <DataTable
            data={tables.data.items}
            columns={columns}
            meta={tables.data.meta}
            onPageChange={setPage}
            emptyTitle={
              schemaName
                ? `El esquema ${schemaName} no tiene tablas registradas en esta versión.`
                : "Esta versión no tiene tablas registradas."
            }
          />
        ) : null}
      </section>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-atlas-muted">
        <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        El inventario se deriva del esquema real de PostgreSQL. Es un catálogo
        de solo lectura: el DDL sigue saliendo por migraciones revisadas en PR.
      </p>
    </>
  );
}
