"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { EndpointItem } from "@/features/systems/types";
import type { QaJourneyStepSpec } from "./journey-types";
import { findPayloadPreset } from "./payload-presets";
import { Input } from "@/shared/components/ui/input";
import { StepAdvancedFields } from "./journey-step-advanced-fields";
import { cn } from "@/shared/lib/cn";
import { JourneyStepEndpointSelect } from "./journey-step-endpoint-select";

export function JourneyStepCard({
  order,
  step,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Readonly<{
  order: number;
  step: QaJourneyStepSpec;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (step: QaJourneyStepSpec) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}>) {
  const [expanded, setExpanded] = useState(false);
  const [endpointLabel, setEndpointLabel] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-atlas-border bg-white shadow-subtle">
      <div className="flex flex-wrap items-center gap-2 border-b border-atlas-border bg-atlas-soft px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-atlas-accent text-xs font-bold text-white">
          {order}
        </span>
        <Input
          value={step.key}
          onChange={(event) => onChange({ ...step, key: event.target.value })}
          placeholder="key"
          className="h-8 w-32 font-mono text-xs"
        />
        <Input
          value={step.name ?? ""}
          onChange={(event) => onChange({ ...step, name: event.target.value })}
          placeholder="Nombre descriptivo del paso"
          className="h-8 min-w-0 flex-1 text-xs"
        />
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            title="Mover arriba"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            title="Mover abajo"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title="Eliminar paso" onClick={onRemove} variant="danger">
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-atlas-muted">
            Endpoint
          </span>
          <JourneyStepEndpointSelect
            endpointId={step.endpointId}
            onSelect={(endpoint: EndpointItem) => {
              const path = endpoint.fullPath ?? endpoint.routePath;
              setEndpointLabel(`${endpoint.method} ${path}`);
              const preset = findPayloadPreset(endpoint.method, path);
              // Solo autocompleta desde el preset si el paso está vacío, para
              // no pisar edits que el usuario ya haya hecho a mano.
              const isEmpty =
                !step.payload && !step.pathParams && !step.queryParams;
              onChange({
                ...step,
                endpointId: endpoint.endpointId,
                ...(preset && isEmpty
                  ? {
                      payload: preset.payload,
                      pathParams: preset.pathParams,
                      queryParams: preset.queryParams,
                    }
                  : {}),
              });
            }}
          />
          {endpointLabel ? (
            <p className="mt-1 truncate text-[11px] text-atlas-muted">
              {endpointLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-medium text-blue-700 underline"
        >
          {expanded
            ? "Ocultar avanzado"
            : "Mostrar avanzado (path/query/payload/extract)"}
        </button>
        {expanded ? (
          <StepAdvancedFields step={step} onChange={onChange} />
        ) : null}
      </div>
    </div>
  );
}

function IconButton({
  title,
  disabled,
  variant = "default",
  onClick,
  children,
}: Readonly<{
  title: string;
  disabled?: boolean;
  variant?: "default" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border border-atlas-border bg-white text-atlas-muted transition-colors hover:text-atlas-text disabled:cursor-not-allowed disabled:opacity-40",
        variant === "danger" && "hover:border-red-300 hover:text-red-600",
      )}
    >
      {children}
    </button>
  );
}
