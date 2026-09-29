"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { ACTOR_LABEL } from "./run-status";
import type { QaSamplePersona, QaTemplateStep } from "./types";

/** Los pasos de una receta, en el orden en que se ejecutan. Vienen enteros con la receta. */
export function TemplateStepsTable({
  steps,
}: Readonly<{ steps: QaTemplateStep[] }>) {
  const columns = useMemo<ColumnDef<QaTemplateStep>[]>(
    () => [
      {
        id: "order",
        header: "N.º",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-semibold text-atlas-muted">
            {row.index + 1}
          </span>
        ),
      },
      {
        id: "step",
        header: "Paso",
        accessorFn: (step) => step.stepKey,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.stepKey}</span>
        ),
      },
      {
        id: "request",
        header: "Petición",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <MethodBadge method={row.original.method} />
            <span className="font-mono text-xs">{row.original.path}</span>
          </div>
        ),
      },
      {
        id: "actor",
        header: "Actor",
        accessorFn: (step) => ACTOR_LABEL[step.actor] ?? step.actor,
        cell: ({ row }) => (
          <Badge tone="muted">
            {ACTOR_LABEL[row.original.actor] ?? row.original.actor}
          </Badge>
        ),
      },
      {
        id: "expect",
        header: "Espera",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.expectStatus.join(" o ")}
          </span>
        ),
      },
      {
        id: "after",
        header: "Después de",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.dependsOn.length > 0
              ? row.original.dependsOn.join(", ")
              : "—"}
          </span>
        ),
      },
      {
        id: "branches",
        header: "Ramas",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.branches.length > 0
              ? row.original.branches
                  .map((b) => `${b.label} (${b.status.join("/")})`)
                  .join(" · ")
              : "—"}
          </span>
        ),
      },
      {
        id: "providers",
        header: "Proveedores",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.providers.length > 0
              ? row.original.providers
                  .map(
                    (p) =>
                      `${p.provider}${p.expectCall ? "" : " (no se llama)"}`,
                  )
                  .join(", ")
              : "—"}
          </span>
        ),
      },
    ],
    [],
  );
  return (
    <DataTable
      data={steps}
      columns={columns}
      emptyTitle="Esta receta no tiene pasos."
      emptyDescription="El servidor no devolvió pasos para esta versión."
    />
  );
}

/** Las cinco personas de muestra que genera el servidor con la semilla por defecto. */
export function SamplePersonasTable({
  personas,
}: Readonly<{ personas: QaSamplePersona[] }>) {
  const columns = useMemo<ColumnDef<QaSamplePersona>[]>(
    () => [
      {
        id: "ordinal",
        header: "N.º",
        accessorFn: (persona) => persona.ordinal,
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.ordinal}</span>
        ),
      },
      {
        id: "name",
        header: "Persona",
        accessorFn: (persona) => `${persona.firstName} ${persona.lastName}`,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-atlas-text">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-atlas-muted">{row.original.city}</p>
          </div>
        ),
      },
      {
        id: "archetype",
        header: "Arquetipo",
        accessorFn: (persona) => persona.archetype,
        cell: ({ row }) => (
          <span className="text-xs">{row.original.archetype}</span>
        ),
      },
      {
        id: "category",
        header: "Categoría del caso",
        accessorFn: (persona) => persona.caseCategory,
        cell: ({ row }) => (
          <span className="text-xs">{row.original.caseCategory}</span>
        ),
      },
      {
        id: "income",
        header: "Ingreso mensual",
        accessorFn: (persona) => persona.monthlyIncome,
        cell: ({ row }) => (
          <span className="tabular-nums text-xs">
            {row.original.monthlyIncome}
          </span>
        ),
      },
      {
        id: "birth",
        header: "Nacimiento",
        accessorFn: (persona) => persona.birthDate,
        cell: ({ row }) => (
          <span className="tabular-nums text-xs">{row.original.birthDate}</span>
        ),
      },
      {
        id: "contact",
        header: "Correo y teléfono",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.email} · {row.original.phone}
          </span>
        ),
      },
    ],
    [],
  );
  return (
    <DataTable
      data={personas}
      columns={columns}
      emptyTitle="El servidor no generó personas de muestra."
      emptyDescription="Vuelve a abrir «Ver datos»."
    />
  );
}
