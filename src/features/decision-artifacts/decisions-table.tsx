"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { ENGINE_PRESENCE_LABEL, enginePresence } from "./engine-presence";
import type {
  AvailableArtifact,
  BindingSource,
  DecisionArtifactBinding,
} from "./types";

const SOURCE_LABEL: Record<
  BindingSource,
  { text: string; tone: "success" | "warning" | "muted"; hint: string }
> = {
  binding: {
    text: "Elegido aquí",
    tone: "success",
    hint: "Alguien eligió el artefacto desde este portal.",
  },
  // Que venga del entorno no es un error, pero sí algo que conviene ver: significa que nadie lo ha
  // decidido desde el portal y que cambiarlo hoy exige un despliegue.
  environment: {
    text: "Heredado del entorno",
    tone: "warning",
    hint: "Nadie lo eligió desde el portal: lo fija el entorno y cambiarlo exige un despliegue.",
  },
  unset: {
    text: "Sin configurar",
    tone: "muted",
    hint: "No hay artefacto asignado a esta decisión.",
  },
};

const PRESENCE_HINT = {
  published: "El motor publica el artefacto asignado.",
  missing:
    "El motor no publica el artefacto asignado: la decisión va a fallar.",
  unknown: "El catálogo del motor llegó vacío: no se puede afirmar nada.",
  unset: "La decisión no tiene artefacto asignado.",
} as const;

function buildFilters(
  available: readonly AvailableArtifact[],
): LocalListFilter<DecisionArtifactBinding>[] {
  return [
    {
      name: "source",
      label: "Origen",
      tooltip:
        "Separa las decisiones elegidas desde el portal de las heredadas del entorno o sin configurar.",
      options: (Object.keys(SOURCE_LABEL) as BindingSource[]).map((value) => ({
        value,
        label: SOURCE_LABEL[value].text,
        description: SOURCE_LABEL[value].hint,
      })),
      test: (binding, value) => binding.source === value,
    },
    {
      name: "presence",
      label: "En el motor",
      tooltip:
        "Deja sólo las decisiones cuyo artefacto existe, no existe o no se pudo confirmar en el catálogo del motor.",
      options: (["published", "missing", "unknown", "unset"] as const).map(
        (value) => ({
          value,
          label:
            value === "unset"
              ? "Sin artefacto"
              : ENGINE_PRESENCE_LABEL[value].text,
          description: PRESENCE_HINT[value],
        }),
      ),
      test: (binding, value) => enginePresence(binding, available) === value,
    },
  ];
}

/**
 * El catálogo de decisiones delegadas al motor. Es un catálogo cerrado y pequeño: llega entero del
 * servidor junto con los artefactos que el motor publica.
 */
export function DecisionsTable({
  bindings,
  available,
}: Readonly<{
  bindings: DecisionArtifactBinding[];
  available: readonly AvailableArtifact[];
}>) {
  const filters = useMemo(() => buildFilters(available), [available]);
  const columns = useMemo<ColumnDef<DecisionArtifactBinding>[]>(
    () => [
      {
        header: "Decisión",
        id: "decision",
        accessorFn: (binding) => binding.title ?? binding.decisionType,
        cell: ({ row }) => (
          <Link
            href={`/internal/settings/decision-artifacts/${row.original.decisionType}`}
            className="block max-w-md"
            data-testid={`decision-row-${row.original.decisionType}`}
          >
            <span className="font-medium text-atlas-text">
              {row.original.title ?? row.original.decisionType}
            </span>
            <span className="mt-0.5 block text-xs text-atlas-muted">
              {row.original.description}
            </span>
          </Link>
        ),
      },
      {
        header: "Artefacto que la resuelve",
        accessorKey: "artifactCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.artifactCode ?? "—"}
          </span>
        ),
      },
      {
        header: "En el motor",
        id: "presence",
        accessorFn: (binding) => enginePresence(binding, available),
        cell: ({ row }) => {
          const presencia =
            ENGINE_PRESENCE_LABEL[enginePresence(row.original, available)];
          return row.original.artifactCode ? (
            <Badge tone={presencia.tone}>{presencia.text}</Badge>
          ) : (
            "—"
          );
        },
      },
      {
        header: "Versión",
        accessorKey: "pinnedVersion",
        cell: ({ row }) => (
          <span className="text-xs text-atlas-muted">
            {row.original.pinnedVersion
              ? `Fijada ${row.original.pinnedVersion}`
              : "Vigente del despliegue"}
          </span>
        ),
      },
      {
        header: "Flujo de trabajo",
        accessorKey: "workflowStage",
        cell: ({ row }) => (
          <span className="text-xs text-atlas-muted">
            {row.original.workflowStage ?? "—"}
          </span>
        ),
      },
      {
        header: "Origen",
        accessorKey: "source",
        cell: ({ row }) => {
          const origen = SOURCE_LABEL[row.original.source];
          return <Badge tone={origen.tone}>{origen.text}</Badge>;
        },
      },
    ],
    [available],
  );

  return (
    <LocalListTable
      rows={bindings}
      columns={columns}
      searchText={(binding) =>
        `${binding.title ?? ""} ${binding.decisionType} ${binding.description ?? ""} ${binding.artifactCode ?? ""} ${binding.workflowStage ?? ""}`
      }
      searchPlaceholder="Buscar por decisión, artefacto o flujo de trabajo…"
      searchTooltip="Recorre las decisiones que Atlas delega en el motor, que son pocas y llegan todas: coincide con parte del nombre, la descripción, el código del artefacto o el flujo de trabajo."
      filters={filters}
      emptyTitle="Atlas no delega ninguna decisión en el motor."
      emptyFilteredTitle="Ninguna decisión coincide con la búsqueda."
    />
  );
}
