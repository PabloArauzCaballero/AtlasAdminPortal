"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Bug } from "lucide-react";
import { Badge, MethodBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { consequenceText } from "./journey-tree-diagram";
import {
  rootName,
  type JourneyTree,
  type NodeState,
} from "./journey-tree-model";
import { STATE_STYLE } from "./journey-tree-shapes";

/**
 * Ficha del paso seleccionado en el árbol: de dónde le llegan los datos, qué
 * datos deja para los siguientes y qué se rompería si respondiera mal. Es el
 * texto que acompaña al dibujo — el dibujo enseña la forma, la ficha el porqué.
 */
export function JourneyTreeNodeDetail({
  tree,
  index,
  state,
  simulatedFailure,
  onToggleFailure,
}: Readonly<{
  tree: JourneyTree;
  index: number;
  state: NodeState;
  simulatedFailure: boolean;
  onToggleFailure: () => void;
}>) {
  const node = tree.nodes[index];
  if (!node) return null;
  const sources = tree.edges.filter((edge) => edge.to === index);

  return (
    <div className="space-y-3 rounded-2xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-atlas-accent">
          Paso {index + 1} de {tree.nodes.length}
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-atlas-text">
          {node.name}
        </h3>
        <p className="mt-1 break-all font-mono text-xs text-atlas-muted">
          {node.resolved
            ? node.route
            : `endpoint #${node.endpointId} sin resolver`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {node.resolved ? <MethodBadge method={node.method} /> : null}
        <Badge
          tone={
            state === "ok"
              ? "success"
              : state === "failed"
                ? "critical"
                : state === "at-risk"
                  ? "warning"
                  : "muted"
          }
        >
          {STATE_STYLE[state].label}
        </Badge>
        <Badge>espera {node.expected.join(" · ")}</Badge>
        {node.destructive ? (
          <Badge tone="critical">destructivo</Badge>
        ) : node.mutating ? (
          <Badge tone="warning">escribe</Badge>
        ) : null}
      </div>

      {node.run ? (
        <p className="rounded-lg border border-atlas-border bg-atlas-soft p-2.5 text-xs leading-5 text-atlas-text">
          <span className="font-semibold">Última corrida — </span>
          {node.run.skipped
            ? node.run.skipped
            : `HTTP ${node.run.httpStatus ?? "?"}${node.run.latencyMs !== undefined ? ` · ${node.run.latencyMs} ms` : ""} · ${node.run.passed ? "pasó" : "falló"}`}
          {node.run.error ? ` · ${node.run.error}` : ""}
        </p>
      ) : null}

      <Section
        icon={<ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />}
        title="Datos que recibe"
        empty="No depende de ningún paso anterior: puede ejecutarse solo."
        isEmpty={node.consumes.length === 0}
      >
        {node.consumes.map((use) => {
          const from = sources.find(
            (edge) => edge.variable === rootName(use.name),
          );
          return (
            <li key={`${use.name}-${use.slot}`} className="leading-5">
              <code className="font-mono text-[0.6875rem] text-indigo-700">
                {`{{${use.name}}}`}
              </code>{" "}
              en {use.slot} —{" "}
              {from ? (
                `viene del paso ${from.from + 1}`
              ) : (
                <span className="font-medium text-amber-700">
                  nadie la extrae: saldrá literal en la petición
                </span>
              )}
            </li>
          );
        })}
      </Section>

      <Section
        icon={<ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />}
        title="Datos que deja"
        empty="No extrae nada: los pasos siguientes no dependen de su respuesta."
        isEmpty={node.produces.length === 0}
      >
        {node.produces.map((variable) => {
          const consumers = tree.edges
            .filter(
              (edge) => edge.from === index && edge.variable === variable.name,
            )
            .map((edge) => edge.to + 1);
          return (
            <li key={variable.name} className="leading-5">
              <code className="font-mono text-[0.6875rem] text-emerald-700">
                {variable.name}
              </code>{" "}
              ←{" "}
              <span className="font-mono text-[0.6875rem]">
                {variable.path}
              </span>
              {consumers.length > 0
                ? ` · lo usa el paso ${consumers.join(", ")}`
                : " · todavía no lo usa ningún paso"}
            </li>
          );
        })}
      </Section>

      <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
        <p className="flex items-start gap-1.5 text-xs leading-5 text-red-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Si responde mal: </span>
            {consequenceText(tree, index)}
          </span>
        </p>
        <Button
          variant={simulatedFailure ? "secondary" : "ghost"}
          className="mt-2"
          onClick={onToggleFailure}
        >
          <Bug className="h-4 w-4" />
          {simulatedFailure
            ? "Quitar el fallo simulado"
            : "Simular que este paso falla"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  empty,
  isEmpty,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-atlas-text">
        {icon}
        {title}
      </p>
      {isEmpty ? (
        <p className="mt-1 text-xs leading-5 text-atlas-muted">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-xs text-atlas-muted">{children}</ul>
      )}
    </div>
  );
}
