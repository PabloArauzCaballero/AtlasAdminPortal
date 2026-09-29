"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { StatusBadge } from "@/shared/components/ui/badges";
import type { SessionCheck } from "./session-checks";

const ESTADO_OPTIONS = [
  {
    value: "ok",
    label: "Correcto",
    description: "La comprobación pasa: no hay nada que hacer.",
  },
  {
    value: "warning",
    label: "Alerta",
    description: "Pasa, pero conviene corregirlo antes de producción.",
  },
  {
    value: "blocked",
    label: "Bloqueo",
    description: "No pasa: hay que resolverlo antes de salir a producción.",
  },
];

const COLUMNS: ColumnDef<SessionCheck>[] = [
  {
    header: "Comprobación",
    accessorKey: "label",
    cell: ({ row }) => (
      <span className="font-medium text-atlas-text">{row.original.label}</span>
    ),
  },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => (
      <StatusBadge value={row.original.status.toUpperCase()} />
    ),
  },
  { header: "Qué significa", accessorKey: "description" },
];

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Las comprobaciones de producción de la sesión actual.
 *
 * La lista sale de la sesión que el navegador ya tiene (no de un endpoint) y es un catálogo cerrado
 * de unas pocas filas: por eso buscador y filtro recorren la lista COMPLETA en el cliente.
 */
export function SessionChecksTable({
  checks,
}: Readonly<{ checks: SessionCheck[] }>) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const visibles = useMemo(() => {
    const buscado = normalizar(q.trim());
    return checks.filter(
      (check) =>
        (!estado || check.status === estado) &&
        (!buscado ||
          normalizar(`${check.label} ${check.description}`).includes(buscado)),
    );
  }, [checks, q, estado]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-atlas-text">
        Checks de producción
      </h2>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por comprobación o descripción…"
        searchTooltip="Recorre todas las comprobaciones, que salen de tu sesión actual y son un catálogo cerrado: coincide con parte del nombre o de la descripción."
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "Resultado de la comprobación: correcto, alerta (conviene corregir) o bloqueo (hay que resolver antes de producción).",
            value: estado,
            options: ESTADO_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(_nombre, valor) => setEstado(valor)}
        onClear={() => {
          setQ("");
          setEstado("");
        }}
      />
      <DataTable
        data={visibles}
        columns={COLUMNS}
        emptyTitle={
          checks.length === 0
            ? "No hay comprobaciones de sesión."
            : "Ninguna comprobación coincide con los filtros."
        }
        emptyDescription={
          checks.length === 0
            ? "Sin sesión activa no hay nada que comprobar."
            : "Cambia o quita el estado o el texto buscado."
        }
      />
    </section>
  );
}
