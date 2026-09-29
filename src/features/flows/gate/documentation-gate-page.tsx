"use client";

import { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { fecha } from "../async/labels";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";
import { useDocumentationGate } from "./hooks";
import type { DocumentationGateCheck } from "./types";

/**
 * La compuerta de antes de certificar, calculada por el backend sobre el estado VIVO del catálogo.
 *
 * Que no pase no es un error de la página: es la respuesta. Lo que importa es que cada comprobación
 * diga su cifra, para que «no se puede certificar» se pueda convertir en una lista de trabajo.
 */
export function DocumentationGatePage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedDocumentationGatePage />
    </PermissionGate>
  );
}

type Estado = "pasa" | "falla" | "sin-medir";

/** Tres estados, no dos: una comprobación que no se pudo medir no «falla» ni «pasa». */
function estadoDe(check: DocumentationGateCheck): Estado {
  if (check.measured === false) return "sin-medir";
  return check.passed ? "pasa" : "falla";
}

const ESTADOS = [
  { value: "falla", label: "Falla", description: "Se midió y no cumple." },
  { value: "pasa", label: "Pasa", description: "Se midió y cumple." },
  {
    value: "sin-medir",
    label: "Sin medir",
    description:
      "Falta cargar lo que hay que medir: no es un fallo ni un acierto.",
  },
];

/** Las comprobaciones llegan enteras del servidor (son pocas): se filtran aquí, sin paginar. */
function filtrar(checks: DocumentationGateCheck[], q: string, estado: string) {
  const texto = q.trim().toLowerCase();
  return checks.filter(
    (check) =>
      (!estado || estadoDe(check) === estado) &&
      (!texto ||
        check.code.toLowerCase().includes(texto) ||
        check.detail.toLowerCase().includes(texto)),
  );
}

const columns: ColumnDef<DocumentationGateCheck>[] = [
  {
    header: "Comprobación",
    accessorKey: "code",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.code}</span>
    ),
  },
  {
    header: "Qué comprueba",
    accessorKey: "detail",
    cell: ({ row }) => <span className="text-sm">{row.original.detail}</span>,
  },
  {
    header: "Cantidad",
    accessorKey: "count",
    cell: ({ row }) => (
      <span className="font-semibold">
        {row.original.measured === false && !row.original.count
          ? "—"
          : row.original.count}
      </span>
    ),
  },
  {
    header: "Estado",
    id: "estado",
    cell: ({ row }) => <CheckBadge check={row.original} />,
  },
];

function AuthorizedDocumentationGatePage() {
  const query = useDocumentationGate();
  const gate = query.data;
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const todas = useMemo(() => gate?.checks ?? [], [gate]);
  const visibles = useMemo(() => filtrar(todas, q, estado), [todas, q, estado]);
  const fallan = gate?.checks.filter(
    (check) => !check.passed && check.measured !== false,
  ).length;
  const sinMedir = gate?.checks.filter(
    (check) => check.measured === false,
  ).length;

  return (
    <>
      <PageHeader
        icon={BadgeCheck}
        eyebrow="Sistemas · Mapa de rutas"
        title="Compuerta de documentación"
        description="Antes de certificar: flujos CRITICAL verificados sobre su código actual, sin escrituras desprotegidas ni deriva de permisos grave abiertas, cola de revisión sin pendientes de riesgo alto y el artefacto de cada bloque cargado."
      />
      <FlowCatalogNotLoaded />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Resultado"
          value={
            gate
              ? gate.passed
                ? "Se puede certificar"
                : gate.artifactsLoaded === false
                  ? "Nada cargado que evaluar"
                  : "No se puede certificar"
              : "—"
          }
          icon={BadgeCheck}
          tone={gate?.passed ? "success" : "warning"}
        />
        <MetricCard
          label="Comprobaciones que fallan"
          value={fallan ?? "—"}
          tone={
            fallan === undefined ? "default" : fallan ? "warning" : "success"
          }
        />
        <MetricCard
          label="Sin medir"
          value={sinMedir ?? "—"}
          tone={sinMedir ? "warning" : "default"}
        />
        <MetricCard
          label="Evaluada"
          value={gate ? fecha(gate.evaluatedAt) : "—"}
        />
      </div>
      {query.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo evaluar la compuerta."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código o por lo que comprueba…"
        searchTooltip="Recorre todas las comprobaciones de la compuerta, que llegan enteras del servidor: coincide con parte del código o del texto de lo que comprueba."
        filters={[
          {
            name: "estado",
            label: "Estado",
            value: estado,
            options: ESTADOS,
            tooltip:
              "Filtra por el resultado de la comprobación. «Sin medir» es distinto de «Falla»: falta cargar lo que hay que medir.",
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(_name, value) => setEstado(value)}
        onClear={() => {
          setQ("");
          setEstado("");
        }}
      />
      {gate ? (
        <DataTable
          data={visibles}
          columns={columns}
          emptyTitle={
            todas.length === 0
              ? "La compuerta no devolvió comprobaciones."
              : "Ninguna comprobación coincide con los filtros."
          }
        />
      ) : null}
    </>
  );
}

function CheckBadge({ check }: Readonly<{ check: DocumentationGateCheck }>) {
  if (check.measured === false)
    return (
      <Badge tone="muted" dot>
        Sin medir
      </Badge>
    );
  return (
    <Badge tone={check.passed ? "success" : "critical"} dot>
      {check.passed ? "Pasa" : "Falla"}
    </Badge>
  );
}
