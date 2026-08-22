"use client";

import { cn } from "@/shared/lib/cn";
import { CONDITION_COLOR, CONDITION_LABEL } from "./workflow-edges";
import { ACTOR_COLOR, ACTOR_LABEL } from "./workflow-node";
import type { WorkflowSummary, WorkflowTree, WorkflowTreeQuery } from "./types";

/**
 * Mandos del lienzo. Los filtros NO se aplican en el cliente: se mandan al
 * backend, que es quien sabe recortar el árbol sin dejar transiciones
 * apuntando a pasos que ya no están.
 */

const ACTORS = ["customer", "internal_user", "system", "external_provider"];

export function WorkflowControls({
  workflows,
  workflowCode,
  versions,
  filters,
  modules,
  showDependencies,
  onWorkflowChange,
  onFiltersChange,
  onShowDependenciesChange,
}: Readonly<{
  workflows: readonly WorkflowSummary[];
  workflowCode: string;
  versions: readonly WorkflowSummary[];
  filters: WorkflowTreeQuery;
  modules: readonly string[];
  showDependencies: boolean;
  onWorkflowChange: (code: string) => void;
  onFiltersChange: (filters: WorkflowTreeQuery) => void;
  onShowDependenciesChange: (value: boolean) => void;
}>) {
  const codes = [...new Set(workflows.map((item) => item.workflowCode))];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Flujo"
        value={workflowCode}
        onChange={onWorkflowChange}
        options={codes.map((code) => ({
          value: code,
          label:
            workflows.find((item) => item.workflowCode === code)?.name ?? code,
        }))}
      />
      <Select
        label="Versión"
        value={filters.version ?? "latest"}
        onChange={(version) => onFiltersChange({ ...filters, version })}
        options={[
          { value: "latest", label: "Vigente (latest)" },
          ...versions.map((item) => ({
            value: item.version,
            label: `${item.version} · ${item.status}${item.isDefault ? " · predeterminada" : ""}`,
          })),
        ]}
      />
      <Select
        label="Módulo"
        value={filters.moduleCode ?? ""}
        onChange={(moduleCode) =>
          onFiltersChange({ ...filters, moduleCode: moduleCode || undefined })
        }
        options={[
          { value: "", label: "Todos" },
          ...modules.map((code) => ({ value: code, label: code })),
        ]}
      />
      <Select
        label="Actor"
        value={filters.actorType ?? ""}
        onChange={(actorType) =>
          onFiltersChange({ ...filters, actorType: actorType || undefined })
        }
        options={[
          { value: "", label: "Todos" },
          ...ACTORS.map((actor) => ({
            value: actor,
            label: ACTOR_LABEL[actor] ?? actor,
          })),
        ]}
      />
      <label className="flex h-9 items-center gap-2 text-xs text-atlas-text">
        <input
          type="checkbox"
          checked={showDependencies}
          onChange={(event) => onShowDependenciesChange(event.target.checked)}
          className="h-4 w-4 rounded border-atlas-border text-atlas-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
        />
        Ver todas las dependencias
      </label>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-[10rem] rounded-lg border border-atlas-border bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function WorkflowTotals({ tree }: Readonly<{ tree: WorkflowTree }>) {
  const items = [
    { label: "etapas", value: tree.totals.stages },
    { label: "pasos (endpoints)", value: tree.totals.steps },
    { label: "transiciones", value: tree.totals.transitions },
    { label: "dependencias", value: tree.totals.dependencies },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-atlas-border bg-white p-2.5"
        >
          <dt className="text-[0.6875rem] leading-4 text-atlas-muted">
            {item.label}
          </dt>
          <dd className="text-lg font-semibold text-atlas-text">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function WorkflowLegend() {
  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
          Flechas (condición de la transición)
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {Object.entries(CONDITION_LABEL).map(([key, label]) => (
            <LegendItem key={key} color={CONDITION_COLOR[key]} label={label} />
          ))}
          <LegendItem color="#a855f7" label="dependencia entre pasos" dashed />
        </ul>
      </div>
      <div>
        <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-atlas-muted">
          Color de la etapa (quién la ejecuta)
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {Object.entries(ACTOR_LABEL).map(([key, label]) => (
            <LegendItem key={key} color={ACTOR_COLOR[key]} label={label} />
          ))}
        </ul>
      </div>
      <p className="text-[0.6875rem] leading-4 text-atlas-muted">
        Borde punteado = etapa o paso opcional. Flecha punteada = rama
        alternativa, no el camino principal.
      </p>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed = false,
}: Readonly<{ color: string; label: string; dashed?: boolean }>) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className={cn("h-0.5 w-5 shrink-0 rounded-full")}
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`
            : color,
        }}
      />
      <span className="text-xs text-atlas-muted">{label}</span>
    </li>
  );
}
