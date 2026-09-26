"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { RunProgress } from "./run-progress";
import { TemplateCatalog } from "./template-catalog";

/**
 * La pestaña de journeys. Abre con el catálogo de recorridos listos: el camino para ejecutar N
 * personas va por el servidor (plan validado, worker, una sesión por persona), no por el
 * navegador. El editor de pasos en JSON sigue disponible, plegado, como diagnóstico de UN recorrido
 * desde esta pestaña.
 */
export function JourneysTab({
  runId,
  onRunIdChange,
  advancedEditor,
}: Readonly<{
  runId: string | null;
  onRunIdChange: (runId: string | null) => void;
  /** El editor manual; se monta sólo al desplegarlo. */
  advancedEditor: ReactNode;
}>) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <div className="space-y-5">
      {runId ? (
        <RunProgress runId={runId} onClose={() => onRunIdChange(null)} />
      ) : null}
      <Card>
        <CardHeader>
          <SectionHeader
            title="Recorridos precargados"
            description="Cada tarjeta es un recorrido completo del flujo. Ejecútalo con las personas que quieras: cada una tiene su cuenta y su sesión, y la corrida sigue aunque cierres la pestaña."
            className="mb-0"
          />
        </CardHeader>
        <CardContent>
          <TemplateCatalog onLaunched={onRunIdChange} />
        </CardContent>
      </Card>
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60">
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-2xl px-4 py-3 text-left"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((value) => !value)}
        >
          {advancedOpen ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          )}
          <Wrench className="h-4 w-4 text-atlas-muted" aria-hidden />
          <span className="flex flex-col items-start">
            <span>Editor avanzado de pasos (diagnóstico)</span>
            <span className="whitespace-normal text-xs font-normal text-atlas-muted">
              Arma a mano UN recorrido y lo ejecuta desde este navegador con tu
              sesión. No sirve para N personas: para eso, usa un recorrido
              precargado.
            </span>
          </span>
        </Button>
        {advancedOpen ? (
          <div className="px-4 pb-4">{advancedEditor}</div>
        ) : null}
      </section>
    </div>
  );
}
