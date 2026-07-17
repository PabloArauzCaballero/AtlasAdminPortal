"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useBusinessTerm } from "./hooks";
import type { BusinessTermDetail } from "./types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, safeText } from "@/shared/lib/format";

type Relation = NonNullable<BusinessTermDetail["relations"]>[number];
type AuditEntry = NonNullable<BusinessTermDetail["audit"]>[number];

const relationColumns: ColumnDef<Relation>[] = [
  { header: "Tipo", accessorKey: "relationType" },
  {
    header: "Origen",
    accessorFn: (row) =>
      row.sourceTable
        ? `${row.sourceTable}${row.sourceColumn ? `.${row.sourceColumn}` : ""}`
        : "—",
  },
  { header: "Destino tipo", accessorKey: "targetType" },
  {
    header: "Destino",
    accessorFn: (row) =>
      row.targetTable
        ? `${row.targetTable}${row.targetColumn ? `.${row.targetColumn}` : ""}`
        : row.targetLabel,
  },
];

const auditColumns: ColumnDef<AuditEntry>[] = [
  { header: "Acción", accessorKey: "action" },
  { header: "Actor", accessorFn: (row) => row.actor ?? "—" },
  {
    header: "Fecha",
    accessorFn: (row) => formatDateTime(row.createdAt),
  },
];

export function BusinessTermDetailPage(props: Readonly<{ termId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
      <AuthorizedBusinessTermDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedBusinessTermDetailPage({
  termId,
}: Readonly<{ termId: string }>) {
  const term = useBusinessTerm(termId);
  const data = term.data;

  return (
    <>
      <PageHeader
        eyebrow="Glosario"
        title={data?.name ?? "Detalle de término"}
        description="Definición, relaciones y uso funcional de un término de negocio."
        actions={data ? <StatusBadge value={data.status} /> : null}
      />
      {term.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {term.error ? (
        <ErrorState
          description={
            isAtlasApiError(term.error)
              ? term.error.message
              : "No se pudo cargar el término."
          }
          requestId={
            isAtlasApiError(term.error) ? term.error.requestId : undefined
          }
          onRetry={() => void term.refetch()}
        />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <KeyValueGrid
            items={[
              { label: "Clave", value: data.key, mono: true },
              { label: "Dominio", value: data.domain },
              { label: "Dueño", value: data.owner },
              { label: "Actualizado", value: formatDateTime(data.updatedAt) },
              { label: "Tablas", value: data.relatedTables?.join(", ") },
              { label: "Columnas", value: data.relatedColumns?.join(", ") },
              { label: "Endpoints", value: data.relatedEndpoints?.join(", ") },
            ]}
          />
          <Card>
            <CardHeader>
              <SectionHeader title="Definición" className="mb-0" />
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-atlas-text">
              <p>{safeText(data.definition)}</p>
              <JsonViewer title="Metadata" value={data.metadata} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Relaciones"
                description="Relaciones de clave foránea u origen documental de este término."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={data.relations ?? []}
                columns={relationColumns}
                emptyTitle="Sin relaciones registradas."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SectionHeader title="Auditoría" className="mb-0" />
            </CardHeader>
            <CardContent>
              <DataTable
                data={data.audit ?? []}
                columns={auditColumns}
                emptyTitle="Sin eventos de auditoría registrados."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
