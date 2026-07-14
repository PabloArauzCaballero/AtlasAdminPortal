"use client";

import {
  BarChart3,
  Database,
  Network,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";

export function GraphControls({
  domains,
  activeDomains,
  onToggleDomain,
  nodeTypes,
  activeTypes,
  onToggleType,
}: Readonly<{
  domains: string[];
  activeDomains: Set<string>;
  onToggleDomain: (domain: string) => void;
  nodeTypes: string[];
  activeTypes: Set<string>;
  onToggleType: (type: string) => void;
}>) {
  return (
    <aside className="atlas-scrollbar hidden w-64 shrink-0 overflow-auto border-l border-atlas-border bg-white p-4 lg:block">
      <h3 className="text-sm font-semibold text-atlas-text">
        Controles del grafo
      </h3>
      <p className="mt-1 text-xs text-atlas-muted">
        Filtra nodos por dominio y tipo de entidad.
      </p>
      <FilterGroup label="Dominios">
        {domains.map((domain) => (
          <CheckOption
            key={domain}
            label={domain}
            checked={activeDomains.has(domain)}
            onChange={() => onToggleDomain(domain)}
          />
        ))}
      </FilterGroup>
      <FilterGroup label="Tipos de nodo">
        {nodeTypes.map((type) => (
          <CheckOption
            key={type}
            label={type}
            checked={activeTypes.has(type)}
            onChange={() => onToggleType(type)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="mt-4">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-atlas-muted">
        {label}
      </span>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: () => void }>) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-atlas-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-atlas-border text-atlas-accent focus:ring-atlas-accent"
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

export function NodeTypeIcon({ nodeType }: Readonly<{ nodeType: string }>) {
  const normalized = nodeType.toLowerCase();
  const className = "h-4 w-4 shrink-0 text-atlas-accent";
  if (normalized.includes("table") || normalized.includes("tabla"))
    return <Database className={className} />;
  if (normalized.includes("endpoint") || normalized.includes("api"))
    return <Zap className={className} />;
  if (normalized.includes("rule") || normalized.includes("regla"))
    return <ShieldCheck className={className} />;
  if (normalized.includes("report") || normalized.includes("reporte"))
    return <BarChart3 className={className} />;
  if (normalized.includes("flow") || normalized.includes("flujo"))
    return <Workflow className={className} />;
  return <Network className={className} />;
}
