"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useLabEndpoints } from "./hooks";
import type { EndpointItem } from "@/features/systems/types";
import { MethodBadge } from "@/shared/components/ui/badges";
import { safeText } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";

/**
 * Combobox compacto para elegir el endpoint de un paso desde la tabla de
 * secuencia, sin saltar a la página completa de selección de endpoints.
 */
export function JourneyStepEndpointSelect({
  endpointId,
  onSelect,
}: Readonly<{
  endpointId: string;
  onSelect: (endpoint: EndpointItem) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const endpoints = useLabEndpoints({ page: 1, limit: 8, q });

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 rounded-lg border border-atlas-border bg-white px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-atlas-muted" />
        <input
          value={open ? q : endpointId ? `#${endpointId}` : ""}
          onFocus={() => {
            setOpen(true);
            setQ("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar endpoint…"
          className="w-full min-w-0 border-none bg-transparent text-xs font-mono text-atlas-text outline-none placeholder:font-sans placeholder:text-atlas-muted"
        />
      </div>
      {open ? (
        <div className="atlas-scrollbar absolute z-20 mt-1 max-h-64 w-72 overflow-auto rounded-lg border border-atlas-border bg-white shadow-card">
          {endpoints.isLoading ? (
            <p className="p-3 text-xs text-atlas-muted">Buscando…</p>
          ) : null}
          {endpoints.data?.items.length === 0 ? (
            <p className="p-3 text-xs text-atlas-muted">Sin resultados.</p>
          ) : null}
          {endpoints.data?.items.map((item) => (
            <button
              key={item.endpointId}
              type="button"
              // onMouseDown en vez de onClick: dispara antes que el onBlur del
              // input, que si no cerraría la lista antes de registrar el clic.
              onMouseDown={() => onSelect(item)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-atlas-soft",
                item.endpointId === endpointId && "bg-atlas-accentSoft",
              )}
            >
              <MethodBadge method={item.method} />
              <span className="min-w-0 flex-1 truncate font-mono">
                {safeText(item.fullPath ?? item.routePath)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
