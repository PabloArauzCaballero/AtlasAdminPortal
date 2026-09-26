"use client";

import { Expand, Maximize2, Minus, Plus, Scan, Shrink } from "lucide-react";
import type { Viewport } from "./workflow-viewport";

/**
 * Barra de navegación del lienzo: zoom, los dos encuadres (tamaño de lectura y
 * flujo entero) y la pantalla completa. Nada de esto edita el flujo.
 */
export function GraphControls({
  viewport,
  expanded,
  onZoom,
  onFit,
  onToggleExpanded,
}: Readonly<{
  viewport: Viewport;
  expanded: boolean;
  onZoom: (factor: number) => void;
  onFit: (mode: "height" | "all") => void;
  onToggleExpanded: () => void;
}>) {
  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-atlas-border bg-white/95 p-1 shadow-subtle">
      <ControlButton label="Alejar" onClick={() => onZoom(1 / 1.2)}>
        <Minus className="h-4 w-4" />
      </ControlButton>
      <span className="w-12 text-center text-[0.6875rem] tabular-nums text-atlas-muted">
        {Math.round(viewport.scale * 100)}%
      </span>
      <ControlButton label="Acercar" onClick={() => onZoom(1.2)}>
        <Plus className="h-4 w-4" />
      </ControlButton>
      <ControlButton
        label="Encuadrar a tamaño de lectura"
        onClick={() => onFit("height")}
      >
        <Scan className="h-4 w-4" />
      </ControlButton>
      <ControlButton label="Ver el flujo entero" onClick={() => onFit("all")}>
        <Maximize2 className="h-4 w-4" />
      </ControlButton>
      <ControlButton
        label={expanded ? "Salir de pantalla completa" : "Pantalla completa"}
        onClick={onToggleExpanded}
      >
        {expanded ? (
          <Shrink className="h-4 w-4" />
        ) : (
          <Expand className="h-4 w-4" />
        )}
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: Readonly<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-md p-1.5 text-atlas-muted transition-colors hover:bg-atlas-soft hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
    >
      {children}
    </button>
  );
}
