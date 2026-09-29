"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { explainFinding, SEVERIDADES } from "../finding-codes";
import type { IdempotencyAudit, SanitizationAudit, Severity } from "../types";
import { SEVERITY_OPTIONS } from "./audit-options";

const ORDEN: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function severidad(value: string) {
  return (
    SEVERIDADES[value as Severity] ?? { label: value, tone: "default" as const }
  );
}

export function SeverityCell({ value }: Readonly<{ value: string }>) {
  const tono = severidad(value);
  return <Badge tone={tono.tone}>{tono.label}</Badge>;
}

/** Los hallazgos llegan en el orden en que se descubrieron; se leen por gravedad. */
export function porGravedad<T extends { severity: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      ORDEN.indexOf(a.severity as Severity) -
      ORDEN.indexOf(b.severity as Severity),
  );
}

export function severityFilter<
  T extends { severity: string },
>(): LocalListFilter<T> {
  return {
    name: "severity",
    label: "Gravedad",
    tooltip:
      "Deja sólo los hallazgos de esa gravedad, de crítico a bajo: los críticos son los que frenan pasar a producción.",
    options: SEVERITY_OPTIONS,
    test: (row, value) => row.severity === value,
  };
}

// --- Consultas repetidas ------------------------------------------------------------------------

type IdempotencyFinding = IdempotencyAudit["findings"][number];

const IDEMPOTENCY_COLUMNS: ColumnDef<IdempotencyFinding>[] = [
  {
    header: "Gravedad",
    accessorKey: "severity",
    cell: ({ row }) => <SeverityCell value={row.original.severity} />,
  },
  {
    header: "Qué pasó",
    id: "what",
    accessorFn: (finding) => explainFinding(finding.code).label,
    cell: ({ row }) => {
      const explicacion = explainFinding(row.original.code);
      return (
        <div className="max-w-md">
          <p className="font-medium text-atlas-text">{explicacion.label}</p>
          <p className="text-xs text-atlas-muted">{explicacion.summary}</p>
        </div>
      );
    },
  },
  { header: "Veces", accessorKey: "occurrences" },
  {
    header: "Solicitudes",
    id: "requests",
    accessorFn: (finding) => finding.requestIds.join(", "),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-muted">
        {row.original.requestIds.join(", ")}
      </span>
    ),
  },
];

export function IdempotencyFindingsTable({
  findings,
}: Readonly<{ findings: IdempotencyFinding[] }>) {
  return (
    <LocalListTable
      rows={findings}
      columns={IDEMPOTENCY_COLUMNS}
      searchText={(finding) =>
        `${explainFinding(finding.code).label} ${explainFinding(finding.code).summary} ${finding.requestIds.join(" ")}`
      }
      searchPlaceholder="Buscar por lo que pasó o por solicitud…"
      searchTooltip="Recorre todos los hallazgos del informe, que llegan enteros: coincide con parte de la explicación o con un número de solicitud."
      filters={[severityFilter<IdempotencyFinding>()]}
      emptyTitle="No se encontró ninguna repetición en la ventana revisada."
      emptyFilteredTitle="Ninguna repetición coincide con la búsqueda."
    />
  );
}

// --- Datos sensibles sin tachar -----------------------------------------------------------------

type SanitizationFinding = SanitizationAudit["findings"][number];

const SANITIZATION_COLUMNS: ColumnDef<SanitizationFinding>[] = [
  {
    header: "Gravedad",
    accessorKey: "severity",
    cell: ({ row }) => <SeverityCell value={row.original.severity} />,
  },
  {
    header: "Clave encontrada",
    accessorKey: "key",
    cell: ({ row }) => (
      <div className="max-w-md">
        <span className="font-mono text-xs">{row.original.key}</span>
        <p className="text-xs text-atlas-muted">
          {explainFinding(row.original.code).summary}
        </p>
      </div>
    ),
  },
  {
    header: "Respuesta",
    accessorKey: "responseId",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-muted">
        {row.original.responseId}
      </span>
    ),
  },
  {
    header: "Solicitud",
    accessorKey: "providerRequestId",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-muted">
        {row.original.providerRequestId}
      </span>
    ),
  },
];

export function SanitizationFindingsTable({
  findings,
}: Readonly<{ findings: SanitizationFinding[] }>) {
  return (
    <LocalListTable
      rows={findings}
      columns={SANITIZATION_COLUMNS}
      searchText={(finding) =>
        `${finding.key} ${finding.responseId} ${finding.providerRequestId} ${explainFinding(finding.code).summary}`
      }
      searchPlaceholder="Buscar por clave, respuesta o solicitud…"
      searchTooltip="Recorre todos los hallazgos del informe, que llegan enteros: coincide con parte de la clave sensible, del número de respuesta o del de solicitud."
      filters={[severityFilter<SanitizationFinding>()]}
      emptyTitle="La muestra revisada está limpia."
      emptyFilteredTitle="Ningún hallazgo coincide con la búsqueda."
    />
  );
}
