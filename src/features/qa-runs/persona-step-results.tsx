"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge, statusTone } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import type { Option } from "@/shared/lib/options";
import { PersonaStepsPanel } from "./persona-steps-panel";
import { useQaRunPersonas } from "./run-hooks";
import { errorProps, PERSONA_STATUS_LABEL } from "./run-status";
import type { QaRunPersona } from "./types";
import { usePageSize } from "@/shared/lib/page-size";

const PAGE_SIZE = 25;

const STATUS_FILTER: Option[] = [
  {
    value: "FAILED",
    label: "Fallaron",
    description: "Personas con al menos un paso que no cumplió lo esperado.",
  },
  {
    value: "BLOCKED",
    label: "Bloqueadas",
    description:
      "Personas que no pudieron empezar o seguir por un requisito ausente.",
  },
  {
    value: "INDETERMINATE",
    label: "Sin conclusión",
    description: "Personas cuyo resultado no se pudo determinar con certeza.",
  },
  {
    value: "RUNNING",
    label: "En curso",
    description: "Personas que están recorriendo el flujo en este momento.",
  },
  {
    value: "PENDING",
    label: "Pendientes",
    description: "Personas en espera de turno que todavía no empezaron.",
  },
  {
    value: "PASSED",
    label: "Pasaron",
    description: "Personas que recorrieron el flujo y cumplieron cada paso.",
  },
  {
    value: "CANCELLED",
    label: "Canceladas",
    description: "Personas detenidas porque se canceló la corrida.",
  },
];

/**
 * Persona → paso → intento. Se pide una página de personas por vez (con su búsqueda y su filtro,
 * que viajan al servidor) y los pasos de UNA persona al abrirla; los cuerpos de respuesta sólo se
 * pintan al abrir un paso concreto. Una corrida de cien personas por diez pasos son mil
 * respuestas: pintarlas todas colgaba la pestaña.
 */
export function PersonaStepResults({
  runId,
  live,
}: Readonly<{ runId: string; live: boolean }>) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [openPersona, setOpenPersona] = useState<string | null>(null);
  const personas = useQaRunPersonas(
    runId,
    {
      page,
      limit: usePageSize(PAGE_SIZE),
      status: status || undefined,
      q: q.trim() || undefined,
    },
    live,
  );
  const columns = useMemo(
    () =>
      withoutClientSorting(
        buildPersonaColumns(openPersona, (key) => setOpenPersona(key)),
      ),
    [openPersona],
  );
  const data = personas.data;
  const filtering = Boolean(status || q.trim());

  return (
    <section aria-label="Personas de la corrida" className="space-y-3">
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por n.º, arquetipo, paso o motivo…"
        searchTooltip="Busca en el servidor, entre TODAS las personas de la corrida: parte de su clave, arquetipo, categoría del caso, paso que falló o motivo; un número o #número, además, su orden en la corrida."
        filters={[
          {
            name: "status",
            label: "Desenlace",
            allLabel: "Todas las personas",
            tooltip:
              "Filtra por el desenlace de cada persona; la corrida no cambia.",
            value: status,
            options: STATUS_FILTER,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(_name, value) => {
          setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setPage(1);
        }}
      />
      {personas.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {personas.error ? (
        <ErrorState
          title="No se pudieron leer las personas"
          {...errorProps(personas.error)}
          onRetry={() => void personas.refetch()}
        />
      ) : null}
      {data ? (
        <DataTable
          data={data.items}
          columns={columns}
          meta={{
            page: data.page,
            limit: data.limit,
            total: data.total,
            totalPages: Math.max(
              Math.ceil(data.total / Math.max(data.limit, 1)),
              1,
            ),
          }}
          onPageChange={setPage}
          emptyTitle={
            filtering
              ? "Ninguna persona coincide con la búsqueda."
              : "Esta corrida todavía no tiene personas."
          }
          emptyDescription={
            filtering
              ? "Cambia el texto o quita el filtro de desenlace."
              : "Las personas aparecen cuando el servidor prepara la corrida."
          }
        />
      ) : null}
      {openPersona ? (
        <PersonaStepsPanel
          runId={runId}
          personaKey={openPersona}
          onClose={() => setOpenPersona(null)}
        />
      ) : null}
    </section>
  );
}

function buildPersonaColumns(
  openPersona: string | null,
  onToggle: (personaKey: string | null) => void,
): ColumnDef<QaRunPersona>[] {
  return [
    {
      id: "persona",
      header: "Persona",
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-xs font-semibold">
            #{row.original.ordinal}
          </p>
          <p className="font-mono text-[0.6875rem] text-atlas-muted">
            {row.original.personaKey}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Desenlace",
      cell: ({ row }) => (
        <Badge tone={statusTone(row.original.status)}>
          {PERSONA_STATUS_LABEL[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "archetype",
      header: "Arquetipo",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.archetype}</span>
      ),
    },
    {
      id: "category",
      header: "Categoría del caso",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.caseCategory}</span>
      ),
    },
    {
      id: "failed",
      header: "Paso que falló",
      cell: ({ row }) =>
        row.original.failedStepKey ? (
          <div className="max-w-md text-xs text-red-700">
            <p className="font-mono">{row.original.failedStepKey}</p>
            <p>{row.original.reason}</p>
          </div>
        ) : (
          <span className="text-xs text-atlas-muted">—</span>
        ),
    },
    {
      id: "actions",
      header: "Pasos",
      meta: { pinRight: true },
      cell: ({ row }) => {
        const open = openPersona === row.original.personaKey;
        return (
          <Button
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            aria-expanded={open}
            aria-label={`${open ? "Ocultar" : "Ver"} los pasos de la persona ${row.original.ordinal}`}
            onClick={() => onToggle(open ? null : row.original.personaKey)}
          >
            {open ? "Ocultar pasos" : "Ver pasos"}
          </Button>
        );
      },
    },
  ];
}
