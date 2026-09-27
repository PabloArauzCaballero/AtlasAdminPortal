import Link from "next/link";
import { Badge, MethodBadge, RiskBadge } from "@/shared/components/ui/badges";
import { clientLabel, STEP_KIND_LABELS, systemLabel } from "./labels";
import type { ProcessStep } from "./types";
import { WiringBadge } from "./wiring-badge";

/**
 * Un paso de una etapa. Arriba, en lenguaje de negocio: qué se hace y si tiene pantalla. El método
 * y la ruta van plegados en «Detalle técnico», para quien tenga que buscarlo en el código.
 */
export function ProcessStepRow({ step }: Readonly<{ step: ProcessStep }>) {
  const unwired = step.wiring === "unwired";
  return (
    <li
      data-testid={`paso-${step.code}`}
      className={
        unwired
          ? "rounded-xl border border-red-200 bg-red-50/60 p-3"
          : "rounded-xl border border-atlas-border bg-white p-3"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-atlas-text">
            {step.name}
            {step.optional ? (
              <span className="ml-2 text-xs font-normal text-atlas-muted">
                (opcional)
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm leading-6 text-atlas-muted">
            {step.description}
          </p>
        </div>
        <span className="flex shrink-0 flex-wrap items-center gap-1">
          <WiringBadge value={step.wiring} />
          {step.risk ? <RiskBadge value={step.risk} /> : null}
        </span>
      </div>
      {unwired ? (
        <p className="mt-2 text-xs font-medium text-red-800">
          Ningún portal hace este paso todavía: hoy sólo se puede hacer a mano o
          pidiéndolo a sistemas.
        </p>
      ) : null}
      <details className="mt-2 text-xs text-atlas-muted">
        <summary className="cursor-pointer select-none">
          Detalle técnico
        </summary>
        <dl className="mt-2 grid gap-1 sm:grid-cols-[9rem_1fr]">
          <dt>Naturaleza</dt>
          <dd>{STEP_KIND_LABELS[step.kind] ?? step.kind}</dd>
          <dt>Bloque</dt>
          <dd>{systemLabel(step.system)}</dd>
          {step.kind === "http" && step.path ? (
            <>
              <dt>Llamada</dt>
              <dd className="flex flex-wrap items-center gap-1 font-mono">
                <MethodBadge method={step.method} />
                {step.path}
              </dd>
            </>
          ) : null}
          {step.job ? (
            <>
              <dt>Tarea</dt>
              <dd className="font-mono">{step.job}</dd>
            </>
          ) : null}
          {step.reason ? (
            <>
              <dt>Por qué no es una llamada</dt>
              <dd>{step.reason}</dd>
            </>
          ) : null}
          {step.events?.length ? (
            <>
              <dt>Avisa con</dt>
              <dd className="font-mono">{step.events.join(", ")}</dd>
            </>
          ) : null}
          {step.kind === "http" ? (
            <>
              <dt>Quién la llama</dt>
              <dd>
                {step.callers.length
                  ? step.callers.map(clientLabel).join(", ")
                  : "Nadie, según el mapa de Flujos"}
              </dd>
            </>
          ) : null}
          {step.verification ? (
            <>
              <dt>Verificación</dt>
              <dd>
                <Badge tone="muted">{step.verification}</Badge>
              </dd>
            </>
          ) : null}
          {step.flowId ? (
            <>
              <dt>En Flujos</dt>
              <dd>
                <Link
                  className="text-atlas-accent underline"
                  href={`/internal/flows?flow=${step.flowId}`}
                >
                  Abrir el flujo
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      </details>
    </li>
  );
}
