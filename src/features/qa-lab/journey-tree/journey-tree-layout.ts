import type { DataFlowEdge } from "./journey-tree-model";

/**
 * Geometría del árbol de decisión. Es un layout fijo y calculable (nada de
 * medir el DOM): cada paso ocupa una fila con su caja, su rombo de decisión y
 * su consecuencia a la derecha; los datos que viajan entre pasos se dibujan
 * como curvas en el carril izquierdo.
 *
 *   carril      caja del paso            consecuencia del "no"
 *  ┌──────┐  ┌────────────────────┐    ┌──────────────────┐
 *  │  ╭─╮ │  │ GET /health        │    │ el dato se rompe │
 *  │  │ │ │  └────────┬───────────┘    └──────────────────┘
 *  │  │ │ │        ◇ ¿200? ──── no ──────────┘
 *  │  ╰─┼─┼──────── sí ─┘
 */
export const RAIL_W = 116;
export const NODE_X = RAIL_W;
export const NODE_W = 296;
export const NODE_H = 92;
export const DIAMOND_W = 214;
export const DIAMOND_H = 48;
export const ROW_GAP = 30;
export const BRANCH_X = NODE_X + NODE_W + 62;
export const BRANCH_W = 218;
export const BRANCH_H = 70;
export const TOP = 16;
export const END_H = 58;

export const ROW_H = NODE_H + DIAMOND_H + ROW_GAP;

export function nodeY(index: number): number {
  return TOP + index * ROW_H;
}

export function diamondCx(): number {
  return NODE_X + NODE_W / 2;
}

export function diamondCy(index: number): number {
  return nodeY(index) + NODE_H + DIAMOND_H / 2;
}

export function svgWidth(): number {
  return BRANCH_X + BRANCH_W + 14;
}

export function svgHeight(nodeCount: number): number {
  return TOP + Math.max(nodeCount, 1) * ROW_H + END_H + 14;
}

/** Carril de la curva; se alternan cuatro para que no se solapen. */
export function laneX(lane: number): number {
  return RAIL_W - 20 - (lane % 4) * 26;
}

/** Curva del dato que viaja del paso `from` al paso `to`. */
export function edgePath(edge: DataFlowEdge, lane: number): string {
  const x = NODE_X - 4;
  const y0 = nodeY(edge.from) + NODE_H * 0.68;
  const y1 = nodeY(edge.to) + NODE_H * 0.32;
  const lx = laneX(lane);
  return `M ${x} ${y0} C ${lx} ${y0}, ${lx} ${y1}, ${x} ${y1}`;
}

export function edgeLabelPoint(
  edge: DataFlowEdge,
  lane: number,
): { x: number; y: number } {
  const y0 = nodeY(edge.from) + NODE_H * 0.68;
  const y1 = nodeY(edge.to) + NODE_H * 0.32;
  // Punto medio aproximado de la bézier (t = 0.5), suficiente para colgar la
  // etiqueta sin resolver la curva analíticamente.
  return { x: (NODE_X - 4 + 3 * laneX(lane)) / 4, y: (y0 + y1) / 2 };
}

/**
 * Corta un texto en líneas para `<tspan>`: SVG no sabe hacer wrap y el ancho de
 * las cajas es fijo, así que se estima por número de caracteres.
 */
export function wrapText(
  text: string,
  maxChars: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    const rest = text.slice(lines.join(" ").length).trim();
    if (rest) lines[maxLines - 1] = `${last.slice(0, maxChars - 1)}…`;
  }
  return lines;
}

/** Trunca por el medio, que es donde una ruta larga tiene lo menos informativo. */
export function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor((maxChars - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}
