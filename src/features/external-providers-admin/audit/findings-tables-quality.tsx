"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime } from "@/shared/lib/format";
import { explainFinding, explainStatus } from "../finding-codes";
import type { QualityAudit, RetentionPreview } from "../types";
import { RESPONSE_STATUS_OPTIONS } from "./audit-options";
import { porGravedad, SeverityCell, severityFilter } from "./findings-tables";

// --- Qué se borraría por antigüedad -------------------------------------------------------------

type RetentionCandidate = NonNullable<RetentionPreview["candidates"]>[number];

const RETENTION_COLUMNS: ColumnDef<RetentionCandidate>[] = [
  {
    header: "Solicitud",
    accessorKey: "requestId",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.requestId}</span>
    ),
  },
  {
    header: "Cliente",
    accessorKey: "customerId",
    cell: ({ row }) => (
      <span className="text-atlas-muted">{row.original.customerId ?? "—"}</span>
    ),
  },
  {
    header: "Cuándo se pidió",
    accessorKey: "requestedAt",
    cell: ({ row }) => (
      <span className="text-atlas-muted">
        {formatDateTime(row.original.requestedAt)}
      </span>
    ),
  },
  {
    header: "Cómo acabó",
    accessorKey: "responseStatus",
    cell: ({ row }) =>
      row.original.responseStatus ? (
        <Badge
          tone={explainStatus(row.original.responseStatus).tone ?? "default"}
        >
          {explainStatus(row.original.responseStatus).label}
        </Badge>
      ) : (
        "—"
      ),
  },
  {
    header: "Qué se haría",
    accessorKey: "action",
    cell: ({ row }) => (
      <span className="text-atlas-muted">{row.original.action ?? "—"}</span>
    ),
  },
];

export function RetentionCandidatesTable({
  candidates,
}: Readonly<{ candidates: RetentionCandidate[] }>) {
  return (
    <LocalListTable
      rows={candidates}
      columns={RETENTION_COLUMNS}
      searchText={(candidate) =>
        `${candidate.requestId} ${candidate.customerId ?? ""} ${candidate.action ?? ""}`
      }
      searchPlaceholder="Buscar por solicitud, cliente o acción…"
      searchTooltip="Recorre todas las candidatas a purga, que llegan enteras en la vista previa: coincide con parte del número de solicitud, del cliente o de la acción."
      filters={[
        {
          name: "status",
          label: "Cómo acabó",
          tooltip:
            "Deja sólo las solicitudes que acabaron de esa manera: completada, fallida, bloqueada…",
          options: RESPONSE_STATUS_OPTIONS,
          test: (candidate, value) =>
            (candidate.responseStatus ?? "").toUpperCase() === value,
        },
      ]}
      emptyTitle="No hay ninguna consulta lo bastante antigua para purgarse."
      emptyFilteredTitle="Ninguna candidata coincide con la búsqueda."
    />
  );
}

// --- Auditoría de calidad -----------------------------------------------------------------------

type QualityFinding = QualityAudit["findings"][number];

const QUALITY_COLUMNS: ColumnDef<QualityFinding>[] = [
  {
    header: "Gravedad",
    accessorKey: "severity",
    cell: ({ row }) => <SeverityCell value={row.original.severity} />,
  },
  {
    header: "Proveedor",
    id: "provider",
    accessorFn: (finding) => finding.providerCode ?? "General",
  },
  {
    header: "Qué pasa",
    id: "what",
    accessorFn: (finding) => explainFinding(finding.code).label,
    cell: ({ row }) => {
      const explicacion = explainFinding(row.original.code);
      return (
        <div className="max-w-md">
          <p className="font-medium text-atlas-text">{explicacion.label}</p>
          <p className="text-xs text-atlas-muted">{explicacion.summary}</p>
          {/* El mensaje del backend nombra la consulta o el bloqueo concreto. */}
          <p className="mt-1 text-xs text-atlas-muted">
            {row.original.message}
          </p>
        </div>
      );
    },
  },
  {
    header: "Qué hacer",
    id: "action",
    accessorFn: (finding) => explainFinding(finding.code).action ?? "—",
    cell: ({ row }) => (
      <span className="block max-w-xs text-xs text-atlas-muted">
        {explainFinding(row.original.code).action ?? "—"}
      </span>
    ),
  },
];

export function QualityFindingsTable({
  findings,
}: Readonly<{ findings: QualityFinding[] }>) {
  const providers = [
    ...new Set(findings.map((finding) => finding.providerCode ?? "General")),
  ].sort();
  return (
    <LocalListTable
      rows={porGravedad(findings)}
      columns={QUALITY_COLUMNS}
      searchText={(finding) =>
        `${finding.providerCode ?? "General"} ${explainFinding(finding.code).label} ${explainFinding(finding.code).summary} ${finding.message}`
      }
      searchPlaceholder="Buscar por proveedor, problema o mensaje…"
      searchTooltip="Recorre todos los hallazgos de la auditoría, que llegan enteros: coincide con parte del proveedor, de la explicación o del mensaje."
      filters={[
        severityFilter<QualityFinding>(),
        {
          name: "provider",
          label: "Proveedor",
          tooltip:
            "Deja sólo los hallazgos de un proveedor. «General» agrupa los que no dependen de uno concreto. Las opciones salen de todos los hallazgos del informe.",
          options: providers.map((value) => ({
            value, // sin-ayuda: proveedores que salen del propio informe, sin ficha que resumir
            label: value,
          })),
          test: (finding, value) =>
            (finding.providerCode ?? "General") === value,
        },
      ]}
      emptyTitle="Ningún proveedor tiene problemas de configuración."
      emptyFilteredTitle="Ningún hallazgo coincide con la búsqueda."
    />
  );
}
