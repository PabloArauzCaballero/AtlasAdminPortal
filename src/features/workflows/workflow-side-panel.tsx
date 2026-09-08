"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { WorkflowLegend } from "./workflow-controls";
import { WorkflowDetail } from "./workflow-detail";
import type { WorkflowSelection } from "./workflow-graph-helpers";
import type { WorkflowTree } from "./types";

/** Ficha y leyenda flotando sobre el lienzo, sin robarle ancho. */
export function SidePanel({
  tree,
  selection,
  onClose,
}: Readonly<{
  tree: WorkflowTree;
  selection: WorkflowSelection;
  onClose: () => void;
}>) {
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-y-3 right-3 flex w-[21rem] max-w-[calc(100%-1.5rem)] flex-col gap-2 overflow-hidden">
      <div className="pointer-events-auto flex justify-end">
        <button
          type="button"
          onClick={() => setLegendOpen((open) => !open)}
          aria-expanded={legendOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-atlas-border bg-white/95 px-3 py-1.5 text-xs font-medium text-atlas-text shadow-subtle hover:bg-atlas-soft"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              legendOpen && "rotate-180",
            )}
            aria-hidden
          />
          {legendOpen ? "Ocultar leyenda" : "Cómo leer el flujo"}
        </button>
      </div>

      {legendOpen ? (
        <div
          data-tutorial-id="workflow-legend"
          className="pointer-events-auto rounded-2xl border border-atlas-border bg-white/97 p-3 shadow-lg backdrop-blur"
        >
          <WorkflowLegend />
        </div>
      ) : null}

      {selection ? (
        <div
          data-tutorial-id="workflow-detail"
          className="atlas-scrollbar pointer-events-auto min-h-0 flex-1 overflow-y-auto rounded-2xl border border-atlas-border bg-white/97 shadow-lg backdrop-blur"
        >
          <div className="sticky top-0 z-10 flex justify-end bg-white/90 p-2 backdrop-blur">
            <button
              type="button"
              aria-label="Cerrar la ficha"
              onClick={onClose}
              className="rounded-md p-1 text-atlas-muted hover:bg-atlas-soft hover:text-atlas-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pb-4">
            <WorkflowDetail tree={tree} selection={selection} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
