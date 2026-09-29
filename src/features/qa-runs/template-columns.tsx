"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Database, Eye, ListOrdered, Play } from "lucide-react";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ACTOR_LABEL, DATASET_OPTIONS, matchedStepsLabel } from "./run-status";
import type { QaTemplateSummary } from "./types";

export type TemplateAction = "steps" | "data" | "preview" | "run";

const STATUS_VIEW = {
  READY: { label: "Lista", tone: "success" },
  DRAFT: { label: "Borrador", tone: "muted" },
  BLOCKED: { label: "Bloqueada", tone: "warning" },
} as const;

/**
 * Las columnas del catálogo de recorridos: qué recorre cada receta, quién actúa, cómo termina y si
 * se puede ejecutar ya. Las acciones de cada receta van en la
 * última columna.
 */
export function buildTemplateColumns({
  canRun,
  onAction,
}: {
  /** Falso cuando el entorno no admite corridas: se ve el catálogo, no se ofrece ejecutar. */
  canRun: boolean;
  onAction: (action: TemplateAction, template: QaTemplateSummary) => void;
}): ColumnDef<QaTemplateSummary>[] {
  return [
    {
      id: "template",
      header: "Recorrido",
      accessorFn: (template) => template.name,
      cell: ({ row }) => {
        const template = row.original;
        return (
          <div
            className="min-w-[14rem] max-w-md"
            data-testid={`qa-template-${template.code}`}
          >
            <p className="font-medium text-atlas-text">{template.name}</p>
            <p className="font-mono text-[0.6875rem] text-atlas-muted">
              {template.code} · v{template.version}
            </p>
            <p className="mt-1 text-xs text-atlas-muted">
              {template.description}
            </p>
            {template.status !== "READY" &&
            template.blockedReasons.length > 0 ? (
              <ul
                className="mt-2 list-disc space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 py-2 pl-6 pr-2 text-xs text-amber-900"
                aria-label={`Motivos por los que ${template.name} no está lista`}
              >
                {template.blockedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Estado",
      accessorFn: (template) => STATUS_VIEW[template.status].label,
      cell: ({ row }) => {
        const view = STATUS_VIEW[row.original.status];
        return <Badge tone={view.tone}>{view.label}</Badge>;
      },
    },
    {
      id: "scope",
      header: "Alcance",
      accessorFn: (template) => template.stepCount,
      cell: ({ row }) => {
        const template = row.original;
        const matched = matchedStepsLabel(template);
        return (
          <span className="text-xs">
            {template.stepCount} pasos del flujo {template.workflowCode}
            {matched ? ` · ${matched}` : ""}
          </span>
        );
      },
    },
    {
      id: "actors",
      header: "Actúan",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.actors
            .map((actor) => ACTOR_LABEL[actor] ?? actor)
            .join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "terminal",
      header: "Desenlace",
      accessorFn: (template) => template.expectedTerminal,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.expectedTerminal}
        </span>
      ),
    },
    {
      id: "datasets",
      header: "Datos",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.datasetModes
            .map((mode) => DATASET_OPTIONS[mode]?.label ?? mode)
            .join(", ")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => {
        const template = row.original;
        const ready = template.status === "READY";
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-8 px-2.5 text-xs"
              onClick={() => onAction("steps", template)}
            >
              <ListOrdered className="h-3.5 w-3.5" aria-hidden />
              Ver pasos
            </Button>
            <Button
              className="h-8 px-2.5 text-xs"
              onClick={() => onAction("data", template)}
            >
              <Database className="h-3.5 w-3.5" aria-hidden />
              Ver datos
            </Button>
            <Button
              className="h-8 px-2.5 text-xs"
              disabled={!canRun || !ready}
              onClick={() => onAction("preview", template)}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Previsualizar
            </Button>
            <Button
              variant="primary"
              className="h-8 px-2.5 text-xs"
              disabled={!canRun || !ready}
              onClick={() => onAction("run", template)}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Ejecutar
            </Button>
          </div>
        );
      },
    },
  ];
}
