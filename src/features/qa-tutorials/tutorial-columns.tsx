"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { statusVisual } from "./status-visuals";
import type { TutorialDefinition, TutorialStatus } from "./types";

export const LEVEL_LABEL: Record<TutorialDefinition["level"], string> = {
  basic: "Básico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

/**
 * Las columnas de «Todos los tutoriales»: qué enseña cada uno, en qué pantalla, cuánto dura, cómo
 * vas y la acción para empezarlo o retomarlo. El avance se guarda en este navegador.
 */
export function buildTutorialColumns({
  start,
  statusFor,
  percentFor,
}: {
  start: (tutorialId: string) => void;
  statusFor: (tutorialId: string) => TutorialStatus;
  percentFor: (tutorialId: string) => number;
}): ColumnDef<TutorialDefinition>[] {
  return [
    {
      id: "tutorial",
      header: "Tutorial",
      accessorFn: (tutorial) => tutorial.title,
      cell: ({ row }) => (
        <div className="min-w-[16rem] max-w-md">
          <p className="font-medium text-atlas-text">{row.original.title}</p>
          <p className="mt-1 text-xs leading-5 text-atlas-muted">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      id: "module",
      header: "Pantalla",
      accessorFn: (tutorial) => tutorial.module,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.module}
          {row.original.tab ? ` · ${row.original.tab}` : ""}
        </span>
      ),
    },
    {
      id: "level",
      header: "Nivel",
      accessorFn: (tutorial) => LEVEL_LABEL[tutorial.level],
      cell: ({ row }) => (
        <span className="text-xs">{LEVEL_LABEL[row.original.level]}</span>
      ),
    },
    {
      id: "duration",
      header: "Duración",
      accessorFn: (tutorial) =>
        tutorial.estimatedMinutes ?? tutorial.steps.length,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs tabular-nums">
          ~{row.original.estimatedMinutes ?? row.original.steps.length} min ·{" "}
          {row.original.steps.length} pasos
        </span>
      ),
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => {
        const status = statusFor(row.original.id);
        const visual = statusVisual(status);
        const percent = percentFor(row.original.id);
        const { Icon } = visual;
        return (
          <div className="min-w-[8rem]">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold ${visual.chipClass}`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {visual.label}
            </span>
            {percent > 0 && status !== "completed" ? (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-atlas-soft">
                <div
                  className="h-full rounded-full bg-atlas-accent"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true } satisfies AtlasColumnMeta,
      cell: ({ row }) => {
        const visual = statusVisual(statusFor(row.original.id));
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              className="h-8 whitespace-nowrap px-2.5 text-xs"
              onClick={() => start(row.original.id)}
            >
              {visual.actionLabel}
            </Button>
            <Link
              href={row.original.route}
              aria-label={`Ir a ${row.original.tool}`}
            >
              <Button variant="secondary" className="h-8 px-2.5 text-xs">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Herramienta
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];
}
