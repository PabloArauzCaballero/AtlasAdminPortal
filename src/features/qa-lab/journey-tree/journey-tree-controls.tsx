"use client";

import { Eye, Pause, Play, RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import type { JourneyTree, Simulation } from "./journey-tree-model";

/**
 * Mandos de la simulación, leyenda y resumen. La simulación no ejecuta nada
 * contra el backend: reproduce sobre el dibujo lo que el runner haría, para
 * poder ver el efecto de un fallo ANTES de provocarlo.
 */

export function TreeControls({
  dryRun,
  playing,
  hasRun,
  failedCount,
  onDryRunChange,
  onTogglePlay,
  onShowAll,
  onUseLastRun,
  onClear,
}: Readonly<{
  dryRun: boolean;
  playing: boolean;
  hasRun: boolean;
  failedCount: number;
  onDryRunChange: (dryRun: boolean) => void;
  onTogglePlay: () => void;
  onShowAll: () => void;
  onUseLastRun: () => void;
  onClear: () => void;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-lg border border-atlas-border bg-atlas-soft p-0.5"
        role="group"
        aria-label="Modo de ejecución simulado"
      >
        <ModeButton
          active={dryRun}
          label="Dry-run"
          onClick={() => onDryRunChange(true)}
        />
        <ModeButton
          active={!dryRun}
          label="Ejecución real"
          onClick={() => onDryRunChange(false)}
        />
      </div>
      <Button variant="secondary" onClick={onTogglePlay}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {playing ? "Pausar" : "Reproducir recorrido"}
      </Button>
      <Button variant="ghost" onClick={onShowAll}>
        <Eye className="h-4 w-4" />
        Ver todo
      </Button>
      {hasRun ? (
        <Button variant="ghost" onClick={onUseLastRun}>
          <Wand2 className="h-4 w-4" />
          Cargar la última corrida
        </Button>
      ) : null}
      {failedCount > 0 ? (
        <Button variant="ghost" onClick={onClear}>
          <RotateCcw className="h-4 w-4" />
          Limpiar fallos simulados ({failedCount})
        </Button>
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: Readonly<{ active: boolean; label: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-white text-atlas-text shadow-subtle"
          : "text-atlas-muted hover:text-atlas-text",
      )}
    >
      {label}
    </button>
  );
}

const LEGEND: { color: string; title: string; detail: string }[] = [
  {
    color: "#10b981",
    title: "Rama «sí»",
    detail:
      "el estado HTTP entra en los esperados y el recorrido baja al siguiente paso",
  },
  {
    color: "#ef4444",
    title: "Rama «no»",
    detail: "el estado no era el esperado: a la derecha se lee la consecuencia",
  },
  {
    color: "#f59e0b",
    title: "Paso en riesgo",
    detail: "se ejecuta igual, pero le llega una variable que nadie resolvió",
  },
  {
    color: "#6366f1",
    title: "Curva de la izquierda",
    detail: "un dato extraído que viaja a un paso posterior como {{variable}}",
  },
];

export function TreeLegend() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {LEGEND.map((item) => (
        <li key={item.title} className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          <p className="text-xs leading-5 text-atlas-muted">
            <span className="font-semibold text-atlas-text">
              {item.title}:{" "}
            </span>
            {item.detail}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function TreeSummary({
  tree,
  simulation,
}: Readonly<{ tree: JourneyTree; simulation: Simulation }>) {
  const writes = tree.nodes.filter((node) => node.mutating).length;
  const orphans = tree.nodes.reduce(
    (total, node) => total + node.orphanVars.length,
    0,
  );
  const atRisk = simulation.states.filter((s) => s === "at-risk").length;
  const items = [
    { label: "pasos", value: tree.nodes.length },
    { label: "datos encadenados", value: tree.edges.length },
    { label: "pasos que escriben", value: writes },
    { label: "pasos en riesgo", value: atRisk, warn: atRisk > 0 },
    { label: "variables huérfanas", value: orphans, warn: orphans > 0 },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-xl border p-2.5",
            item.warn
              ? "border-amber-200 bg-amber-50"
              : "border-atlas-border bg-white",
          )}
        >
          <dt className="text-[0.6875rem] leading-4 text-atlas-muted">
            {item.label}
          </dt>
          <dd
            className={cn(
              "text-lg font-semibold",
              item.warn ? "text-amber-700" : "text-atlas-text",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
