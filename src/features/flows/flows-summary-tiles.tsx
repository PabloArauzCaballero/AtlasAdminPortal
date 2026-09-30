"use client";

import { MetricCard } from "@/shared/components/layout/metric-card";

import { type FlowsSummary } from "./types";

/**
 * Las seis cifras de cabecera del mapa de flujos.
 *
 * Salen de `flows-page.tsx` porque la pantalla seguía por encima de las 300 líneas que admite
 * `yarn max-lines` después de llevarse las columnas. Son presentación pura: reciben ya calculado
 * lo que muestran, y así la pantalla queda con lo que decide qué se pide y qué se filtra.
 */
export function FlowsSummaryTiles({
  summary,
  critical,
  broken,
  stale,
  setFilter,
}: Readonly<{
  summary: FlowsSummary | undefined;
  critical: number;
  broken: number;
  stale: number;
  setFilter: (name: string, value: string) => void;
}>) {
  /*
   * Seis tarjetas del MISMO alto y sin iconos sueltos.
   *
   * Antes tres iban dentro de un botón que no se estiraba —más bajas que las demás— y sólo tres
   * llevaban icono, así que la fila parecía de piezas distintas y nada decía cuáles se podían
   * pulsar. Ahora todas ocupan la celda entera y las que filtran la tabla lo dicen en su texto.
   */
  const filtra = (name: string, value: string, label: string) => ({
    onClick: () => setFilter(name, value),
    "aria-label": `${label}: filtrar la tabla`,
  });
  return (
    <div className="mb-6 grid auto-rows-fr gap-4 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        className="h-full"
        label="Flujos"
        value={summary?.total ?? "—"}
        hint="Una fila por operación de cada sistema"
      />
      <FilterTile {...filtra("risk", "CRITICAL", "Críticos")}>
        <MetricCard
          className="h-full"
          label="Críticos"
          value={summary ? critical : "—"}
          tone="critical"
          hint="Escriben en identidad, crédito, dinero o borran. Toca para filtrar."
        />
      </FilterTile>
      <FilterTile {...filtra("verification", "BROKEN", "Rotos")}>
        <MetricCard
          className="h-full"
          label="Rotos"
          value={summary ? broken : "—"}
          tone={broken ? "critical" : "success"}
          hint="Una llamada real contradijo el mapa. Toca para filtrar."
        />
      </FilterTile>
      <FilterTile {...filtra("freshness", "STALE", "Desactualizados")}>
        <MetricCard
          className="h-full"
          label="Desactualizados"
          value={summary ? stale : "—"}
          tone={stale ? "warning" : "default"}
          hint="Cambió su código desde la última verificación. Toca para filtrar."
        />
      </FilterTile>
      <MetricCard
        className="h-full"
        label="Escrituras públicas"
        value={summary?.publicWrites ?? "—"}
        tone={summary?.publicWrites ? "warning" : "default"}
        hint="Cambian datos sin inicio de sesión"
      />
      <MetricCard
        className="h-full"
        label="Críticos sin pruebas"
        value={summary?.untestedCritical ?? "—"}
        tone={summary?.untestedCritical ? "warning" : "success"}
        hint="Riesgo alto o crítico sin prueba automática"
      />
    </div>
  );
}

function FilterTile({
  children,
  onClick,
  "aria-label": ariaLabel,
}: Readonly<{
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}>) {
  return (
    <button
      type="button"
      className="h-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
