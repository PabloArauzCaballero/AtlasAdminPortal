"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { RuntimeJobCard } from "./runtime-job-card";
import { RUNTIME_JOBS } from "./runtime-job-catalog";
import { buildRuntimeJobColumns } from "./runtime-job-columns";
import type { RuntimeJobDefinition } from "./types";

const IMPACTO_OPTIONS = [
  {
    value: "destructive",
    label: "Borran o anonimizan",
    description: "Ejecutados en real, escriben sobre datos productivos.",
  },
  {
    value: "safe",
    label: "Mueven cola o recalculan",
    description: "No borran datos.",
  },
];

const ENSAYO_OPTIONS = [
  {
    value: "yes",
    label: "Con ensayo",
    description: "Se puede correr primero sin escribir nada.",
  },
  {
    value: "no",
    label: "Sólo en real",
    description: "El backend no admite ensayo: se ejecuta de verdad o no.",
  },
];

/**
 * Pestaña «Ejecutar ahora» de Jobs (antes la pantalla «Jobs de runtime»). El
 * gate por rol lo pone la página contenedora.
 */
export function RuntimeJobsPanel() {
  const [q, setQ] = useState("");
  const [impacto, setImpacto] = useState("");
  const [ensayo, setEnsayo] = useState("");
  const [running, setRunning] = useState<RuntimeJobDefinition | null>(null);
  const columns = useMemo(() => buildRuntimeJobColumns(setRunning), []);
  const needle = q.trim().toLowerCase();
  const visibles = RUNTIME_JOBS.filter((job) => {
    if (impacto === "destructive" && !job.destructive) return false;
    if (impacto === "safe" && job.destructive) return false;
    if (ensayo === "yes" && job.supportsDryRun === false) return false;
    if (ensayo === "no" && job.supportsDryRun !== false) return false;
    return (
      !needle ||
      `${job.title} ${job.code} ${job.business} ${job.systems}`
        .toLowerCase()
        .includes(needle)
    );
  });

  return (
    <div className="space-y-4">
      <BusinessContextNote>
        Todos los jobs arrancan en <strong>ensayo (dry-run)</strong> a
        propósito: reportan lo que harían sin escribir nada. La ejecución real
        exige confirmación explícita y, en los jobs que borran o anonimizan,
        teclear el código del job. El backend los restringe además a los roles{" "}
        <span className="font-mono">admin</span>,{" "}
        <span className="font-mono">platform_admin</span> y{" "}
        <span className="font-mono">system</span>. Cada ejecución queda en la
        pestaña «Historial» con su número de corrida.
      </BusinessContextNote>

      <FilterBar
        search={q}
        searchPlaceholder="Buscar job por nombre, código o para qué sirve…"
        searchTooltip="Recorre el catálogo de jobs, que es un conjunto cerrado y pequeño que llega entero con la pantalla: coincide con parte del nombre, del código, de lo que resuelve o de lo que hace en los sistemas."
        filters={[
          {
            name: "impacto",
            label: "Impacto",
            tooltip: "Si ejecutarlo en real borra o anonimiza datos.",
            value: impacto,
            options: IMPACTO_OPTIONS,
          },
          {
            name: "ensayo",
            label: "Ensayo",
            tooltip: "Si el job admite correr primero sin escribir nada.",
            value: ensayo,
            options: ENSAYO_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(name, value) => {
          if (name === "impacto") setImpacto(value);
          if (name === "ensayo") setEnsayo(value);
        }}
        onClear={() => {
          setQ("");
          setImpacto("");
          setEnsayo("");
        }}
      />

      <DataTable
        data={visibles}
        columns={columns}
        emptyTitle="Ningún job coincide con la búsqueda."
        emptyDescription="Prueba con otro texto o quita los filtros."
      />

      <DrawerPanel
        open={running !== null}
        title={running ? `Ejecutar: ${running.title}` : "Ejecutar un job"}
        onClose={() => setRunning(null)}
      >
        {running ? (
          <RuntimeJobCard key={running.code} definition={running} />
        ) : null}
      </DrawerPanel>
    </div>
  );
}
