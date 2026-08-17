"use client";

import { ACTOR_LABEL } from "./workflow-node";
import type { GraphNode } from "./workflow-graph-layout";
import type { Viewport } from "./workflow-viewport";

/**
 * Tooltip del nodo. Va en HTML (no en SVG) porque necesita texto que se ajuste
 * solo y tamaño de letra constante: dentro del lienzo, el zoom lo encogería
 * justo cuando más falta hace leerlo.
 *
 * Se posiciona con la misma cámara que el grafo, así que sigue al nodo cuando
 * se arrastra o se hace zoom.
 */
export function WorkflowNodeTooltip({
  node,
  viewport,
  host,
}: Readonly<{
  node: GraphNode;
  viewport: Viewport;
  host: { width: number; height: number };
}>) {
  const left = viewport.x + (node.x + node.width) * viewport.scale + 10;
  const top = viewport.y + node.y * viewport.scale;
  // Si el nodo está pegado al borde derecho, el tooltip salta al otro lado.
  const flip = left + 300 > host.width;
  const style = flip
    ? {
        right: Math.max(
          8,
          host.width - (viewport.x + node.x * viewport.scale) + 10,
        ),
        top,
      }
    : { left, top };

  const { step } = node;
  return (
    <div
      role="tooltip"
      style={style}
      className="pointer-events-none absolute z-20 w-[19rem] rounded-xl border border-atlas-border bg-white/98 p-3 shadow-lg backdrop-blur"
    >
      <p className="break-all font-mono text-[0.6875rem] text-atlas-accent">
        {step.httpMethod} {step.routePath}
      </p>
      <p className="mt-1 text-xs font-semibold text-atlas-text">{step.name}</p>
      {step.description ? (
        <p className="mt-1 line-clamp-3 text-[0.6875rem] leading-4 text-atlas-muted">
          {step.description}
        </p>
      ) : null}

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6875rem]">
        <Row label="Etapa" value={node.stageCode} />
        <Row
          label="Actor"
          value={ACTOR_LABEL[node.actorType] ?? node.actorType}
        />
        <Row label="Obligatorio" value={step.isMandatory ? "sí" : "no"} />
        <Row
          label="Sesión"
          value={step.requiresAuth ? "requerida" : "público"}
        />
        {step.requiresIdempotencyKey ? (
          <Row label="Idempotencia" value="requerida" />
        ) : null}
        {step.dependsOn.length > 0 ? (
          <Row label="Depende de" value={`${step.dependsOn.length} paso(s)`} />
        ) : null}
      </dl>

      {step.requiredStates.length > 0 ? (
        <p className="mt-1.5 text-[0.6875rem] leading-4 text-atlas-muted">
          <span className="font-semibold">Estado requerido: </span>
          {step.requiredStates.join(", ")}
        </p>
      ) : null}
      {step.possibleErrors.length > 0 ? (
        <p className="mt-1 text-[0.6875rem] leading-4 text-red-700">
          {step.possibleErrors.slice(0, 3).map(String).join(" · ")}
        </p>
      ) : null}
      <p className="mt-1.5 text-[0.625rem] text-atlas-muted">
        Pulsa para abrir su ficha y probarlo.
      </p>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col">
      <dt className="text-[0.625rem] uppercase tracking-[0.06em] text-atlas-muted">
        {label}
      </dt>
      <dd className="truncate font-medium text-atlas-text">{value}</dd>
    </div>
  );
}
