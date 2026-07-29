"use client";

import { useMemo } from "react";
import {
  ArrowDefs,
  ConsequenceBox,
  DecisionDiamond,
  NoBranch,
  TerminalBox,
  YesBranch,
} from "./journey-tree-branches";
import { DataFlowCurve, RunToken } from "./journey-tree-rail";
import { svgHeight, svgWidth } from "./journey-tree-layout";
import { STATE_STYLE, TreeNodeBox } from "./journey-tree-shapes";
import {
  impactedBy,
  rootName,
  type JourneyTree,
  type NodeState,
  type Simulation,
} from "./journey-tree-model";

/**
 * El árbol dibujado. No decide nada: recibe el modelo, la simulación y la
 * selección, y los pinta. Cada paso es un nodo enfocable (teclado incluido)
 * para que el detalle lateral se pueda abrir sin ratón.
 */
export function JourneyTreeDiagram({
  tree,
  simulation,
  selected,
  cursor,
  playing,
  onSelect,
}: Readonly<{
  tree: JourneyTree;
  simulation: Simulation;
  selected: number | null;
  cursor: number;
  playing: boolean;
  onSelect: (index: number) => void;
}>) {
  const width = svgWidth();
  const height = svgHeight(tree.nodes.length);
  const broken = useMemo(
    () => new Set(simulation.brokenVars.map(rootName)),
    [simulation.brokenVars],
  );
  const related = useMemo(() => {
    if (selected === null) return new Set<number>();
    const linked = tree.edges
      .filter((edge) => edge.from === selected || edge.to === selected)
      .map((edge) => (edge.from === selected ? edge.to : edge.from));
    return new Set(linked);
  }, [tree.edges, selected]);

  const failed = simulation.states.filter((s) => s === "failed").length;
  const atRisk = simulation.states.filter((s) => s === "at-risk").length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="h-auto max-w-none"
      aria-label={`Árbol de decisión con ${tree.nodes.length} pasos, ${tree.edges.length} datos encadenados`}
    >
      <ArrowDefs />

      {tree.edges.map((edge, lane) => (
        <DataFlowCurve
          key={`${edge.from}-${edge.to}-${edge.variable}`}
          edge={edge}
          lane={lane}
          active={
            selected === null || selected === edge.from || selected === edge.to
          }
          broken={broken.has(edge.variable)}
        />
      ))}

      {tree.nodes.map((node) => {
        const state = simulation.states[node.index] ?? "pending";
        const isLast = node.index === tree.nodes.length - 1;
        return (
          <g key={node.key}>
            <DecisionDiamond
              index={node.index}
              expected={node.expected}
              state={state}
            />
            <YesBranch
              index={node.index}
              isLast={isLast}
              taken={state === "ok"}
            />
            <NoBranch index={node.index} taken={state === "failed"} />
            <ConsequenceBox
              index={node.index}
              text={consequenceText(tree, node.index)}
              taken={state === "failed"}
            />
            <g
              role="button"
              tabIndex={0}
              aria-label={nodeLabel(tree, node.index, state)}
              aria-pressed={selected === node.index}
              className="cursor-pointer focus:outline-none [&:focus-visible>rect:first-of-type]:stroke-[3]"
              onClick={() => onSelect(node.index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(node.index);
                }
              }}
            >
              <TreeNodeBox
                node={node}
                state={state}
                selected={selected === node.index}
                highlighted={related.has(node.index)}
              />
            </g>
          </g>
        );
      })}

      {tree.nodes.length > 0 ? (
        <TerminalBox
          count={tree.nodes.length}
          failed={failed}
          atRisk={atRisk}
        />
      ) : null}
      {playing && cursor >= 0 && cursor < tree.nodes.length ? (
        <RunToken index={cursor} />
      ) : null}
    </svg>
  );
}

/** Qué pasa aguas abajo si este paso se va por la rama «no». */
export function consequenceText(tree: JourneyTree, index: number): string {
  const node = tree.nodes[index];
  if (!node) return "";
  if (node.produces.length === 0) {
    return "El recorrido continúa, pero el paso queda marcado como fallo en el resultado.";
  }
  const names = node.produces.map((v) => v.name).join(", ");
  const impacted = impactedBy(tree, index);
  if (impacted.length === 0) {
    return `Se pierde ${names}, aunque ningún paso posterior lo usa todavía.`;
  }
  const list = impacted.map((i) => i + 1).join(", ");
  return impacted.length === 1
    ? `Se pierde ${names}: el paso ${list} sale con el marcador sin resolver.`
    : `Se pierde ${names}: los pasos ${list} salen con el marcador sin resolver.`;
}

function nodeLabel(tree: JourneyTree, index: number, state: NodeState): string {
  const node = tree.nodes[index];
  return `Paso ${index + 1}: ${node.name}. ${node.method} ${node.route}. Espera ${node.expected.join(" o ")}. Estado: ${STATE_STYLE[state].label}.`;
}
