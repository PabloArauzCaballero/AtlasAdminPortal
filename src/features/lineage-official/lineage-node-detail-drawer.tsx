"use client";

import { useMemo } from "react";
import { useLineageNode } from "./hooks";
import { buildLineageEdgeColumns } from "./lineage-columns";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { DataTable } from "@/shared/components/data-table/data-table";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { RiskBadge, StatusBadge } from "@/shared/components/ui/badges";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import type { LineageEdge } from "./types";

export function NodeDetailDrawer({
  nodeId,
  onClose,
}: Readonly<{ nodeId: string; onClose: () => void }>) {
  const node = useLineageNode(nodeId);
  const edgeColumns = useMemo(() => buildLineageEdgeColumns(), []);
  const data = node.data;
  return (
    <DrawerPanel
      open
      title={data?.label ?? "Detalle de nodo"}
      onClose={onClose}
    >
      {node.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {data ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <StatusBadge value={data.status} />
            {data.criticality ? <RiskBadge value={data.criticality} /> : null}
          </div>
          <KeyValueGrid
            items={[
              { label: "Tipo", value: data.nodeType },
              { label: "Dominio", value: data.domain },
              { label: "Referencia", value: data.referenceId, mono: true },
            ]}
          />
          <NodeEdgeTable
            title="Entradas"
            data={data.incomingEdges ?? []}
            columns={edgeColumns}
          />
          <NodeEdgeTable
            title="Salidas"
            data={data.outgoingEdges ?? []}
            columns={edgeColumns}
          />
          <JsonViewer title="Metadata" value={data.metadata} />
        </div>
      ) : null}
    </DrawerPanel>
  );
}

function NodeEdgeTable({
  title,
  data,
  columns,
}: Readonly<{
  title: string;
  data: LineageEdge[];
  columns: Parameters<typeof DataTable<LineageEdge>>[0]["columns"];
}>) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
        {title}
      </h4>
      <DataTable
        data={data}
        columns={columns}
        emptyTitle="Sin relaciones registradas."
      />
    </div>
  );
}
