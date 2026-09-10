"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge, MethodBadge, RiskBadge } from "@/shared/components/ui/badges";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";
import type { BusinessProcess, BusinessStep } from "../types";

/**
 * Un proceso de negocio como historia: sus pasos en orden, agrupados por etapa, y cada uno
 * enlazado al flujo que lo implementa (riesgo, verificación, tests). Es el nivel «funcional»
 * del plan: se lee sin saber de endpoints, pero cada paso lleva al detalle técnico.
 */
export function BusinessProcessCard({
  process,
  onOpenFlow,
}: Readonly<{
  process: BusinessProcess;
  onOpenFlow: (flowId: string) => void;
}>) {
  // Abierta por defecto: la pantalla existe para leer los pasos, no para contar tarjetas. Se puede
  // plegar, y un proceso con pasos sin flujo se queda abierto aunque el resto se cierre.
  const [open, setOpen] = useState(true);
  const etapas = agruparPorEtapa(process.steps);
  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown
              className="mt-1 h-4 w-4 shrink-0 text-atlas-muted"
              aria-hidden
            />
          ) : (
            <ChevronRight
              className="mt-1 h-4 w-4 shrink-0 text-atlas-muted"
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-atlas-text">
              {process.name}
            </span>
            <span className="block font-mono text-xs text-atlas-muted">
              {process.workflowCode} · {process.version}
            </span>
          </span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            <Badge tone="muted">{process.stepCount} pasos</Badge>
            {process.critical ? (
              <Badge tone="critical">{process.critical} críticos</Badge>
            ) : null}
            {process.verified ? (
              <Badge tone="success">{process.verified} verificados</Badge>
            ) : null}
            {process.unlinked ? (
              <Badge tone="warning">{process.unlinked} sin flujo</Badge>
            ) : (
              <Badge tone="success">todo enlazado</Badge>
            )}
          </span>
        </button>
      </CardHeader>
      {open ? (
        <CardContent>
          <ol className="space-y-4">
            {etapas.map(([etapa, pasos]) => (
              <li key={etapa}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-atlas-muted">
                  {etapa}
                </p>
                <ol className="space-y-1">
                  {pasos.map((paso) => (
                    <PasoFila
                      key={paso.stepCode}
                      paso={paso}
                      onOpenFlow={onOpenFlow}
                    />
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </CardContent>
      ) : null}
    </Card>
  );
}

/** Los pasos ya vienen ordenados por etapa y `execution_order`: agrupar conserva ese orden. */
function agruparPorEtapa(
  steps: BusinessStep[],
): Array<[string, BusinessStep[]]> {
  const mapa = new Map<string, BusinessStep[]>();
  for (const step of steps) {
    const etapa = step.stage ?? "Sin etapa";
    mapa.set(etapa, [...(mapa.get(etapa) ?? []), step]);
  }
  return [...mapa.entries()];
}

function PasoFila({
  paso,
  onOpenFlow,
}: Readonly<{ paso: BusinessStep; onOpenFlow: (flowId: string) => void }>) {
  const contenido = (
    <>
      <span className="w-8 shrink-0 text-right font-mono text-[11px] text-atlas-muted">
        {paso.order}
      </span>
      <MethodBadge method={paso.method} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{paso.name}</span>
        <span className="block truncate font-mono text-[11px] text-atlas-muted">
          {paso.path}
        </span>
      </span>
      {paso.risk ? <RiskBadge value={paso.risk} /> : null}
      {paso.verification === "VERIFIED" ? (
        <Badge tone="success">verificado</Badge>
      ) : null}
      {paso.verification === "BROKEN" ? (
        <Badge tone="critical">roto</Badge>
      ) : null}
      {paso.testStatus === "UNTESTED" ? (
        <Badge tone="muted">sin test</Badge>
      ) : null}
      {!paso.mandatory ? <Badge tone="muted">opcional</Badge> : null}
    </>
  );
  if (!paso.flowId) {
    return (
      <li
        className="flex items-center gap-2 rounded border border-dashed border-amber-300 bg-amber-50/40 px-2 py-1"
        title="El paso declara una ruta que el catálogo no tiene: o cambió, o ya no existe"
      >
        {contenido}
        <Badge tone="warning">sin flujo</Badge>
      </li>
    );
  }
  return (
    <li className="rounded border border-atlas-line hover:border-atlas-accent">
      <button
        type="button"
        className={cn("flex w-full items-center gap-2 px-2 py-1 text-left")}
        onClick={() => onOpenFlow(paso.flowId as string)}
      >
        {contenido}
      </button>
    </li>
  );
}
