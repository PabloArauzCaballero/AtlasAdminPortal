"use client";

import { useMemo } from "react";
import { useLineageNode } from "./hooks";
import {
  buildLineageEdgeColumns,
  buildLineageNodeColumns,
} from "./lineage-columns";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";

export function LineageNodeDetailPage(props: Readonly<{ nodeId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["lineage.read"]}>
      <AuthorizedLineageNodeDetailPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedLineageNodeDetailPage({
  nodeId,
}: Readonly<{ nodeId: string }>) {
  const node = useLineageNode(nodeId);
  const edgeColumns = useMemo(() => buildLineageEdgeColumns(), []);
  const nodeColumns = useMemo(() => buildLineageNodeColumns(), []);
  const data = node.data;

  return (
    <>
      <PageHeader
        eyebrow="Lineage"
        title={data?.label ?? "Detalle de nodo"}
        description="Impacto entrante, saliente y metadata de un nodo oficial."
        actions={data ? <RiskBadge value={data.criticality} /> : null}
      />
      {node.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {node.error ? (
        <ErrorState
          description={
            isAtlasApiError(node.error)
              ? node.error.message
              : "No se pudo cargar el nodo."
          }
          requestId={
            isAtlasApiError(node.error) ? node.error.requestId : undefined
          }
          onRetry={() => void node.refetch()}
        />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <KeyValueGrid
            items={[
              { label: "Tipo", value: data.nodeType },
              { label: "Dominio", value: data.domain },
              { label: "Estado", value: data.status },
              { label: "Referencia", value: data.referenceId, mono: true },
            ]}
          />
          <StatusBadge value={data.status} />
          <NodeTable
            title="Entradas"
            data={data.incomingEdges ?? []}
            columns={edgeColumns}
          />
          <NodeTable
            title="Salidas"
            data={data.outgoingEdges ?? []}
            columns={edgeColumns}
          />
          <NodeTable
            title="Nodos relacionados"
            data={data.relatedNodes ?? []}
            columns={nodeColumns}
          />
          <JsonViewer title="Metadata" value={data.metadata} />
        </div>
      ) : null}
    </>
  );
}

function NodeTable<T>({
  title,
  data,
  columns,
}: Readonly<{
  title: string;
  data: T[];
  columns: Parameters<typeof DataTable<T>>[0]["columns"];
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title={title} className="mb-0" />
      </CardHeader>
      <CardContent>
        <DataTable
          data={data}
          columns={columns}
          emptyTitle="Sin relaciones registradas."
        />
      </CardContent>
    </Card>
  );
}
