"use client";

import { useBusinessTerm } from "./hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
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

export function BusinessTermDetailPage({
  termId,
}: Readonly<{ termId: string }>) {
  const term = useBusinessTerm(termId);
  const data = term.data;

  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
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
          <JsonViewer
            title="Relaciones y auditoría"
            value={{ relations: data.relations ?? [], audit: data.audit ?? [] }}
          />
        </div>
      ) : null}
    </PermissionGate>
  );
}
