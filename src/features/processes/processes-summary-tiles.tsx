"use client";

import { BadgeCheck, Cable, Route, Unplug } from "lucide-react";
import { MetricCard } from "@/shared/components/layout/metric-card";
import type { ProcessTotals } from "./types";

/**
 * Las cuatro cifras de cabecera. Tres de ellas filtran la tabla al pulsarlas: una cifra que pide
 * atención («3 pasos sin pantalla») tiene que llevar a los procesos que la explican.
 */
export function ProcessesSummaryTiles({
  totals,
  setStatus,
}: Readonly<{
  totals: ProcessTotals | undefined;
  setStatus: (value: string) => void;
}>) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" className="text-left" onClick={() => setStatus("")}>
        <MetricCard
          label="Procesos"
          value={totals?.processes ?? "—"}
          icon={Route}
          hint="Declarados en el código de Atlas"
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => setStatus("documented")}
      >
        <MetricCard
          label="Documentados"
          value={totals?.documented ?? "—"}
          icon={BadgeCheck}
          tone={
            totals && totals.documented < totals.processes
              ? "warning"
              : "success"
          }
          hint="Cumplen las cinco comprobaciones"
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => setStatus("wired")}
      >
        <MetricCard
          label="Totalmente cableados"
          value={totals?.fullyWired ?? "—"}
          icon={Cable}
          tone="info"
          hint="Cada paso de una persona tiene su pantalla"
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => setStatus("unwired")}
      >
        <MetricCard
          label="Pasos sin pantalla"
          value={totals?.unwiredSteps ?? "—"}
          icon={Unplug}
          tone={totals?.unwiredSteps ? "critical" : "success"}
          hint="Una persona debería hacerlos y ningún portal lo permite"
        />
      </button>
    </div>
  );
}
