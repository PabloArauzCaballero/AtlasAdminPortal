import type { EndpointItem } from "@/features/systems/types";
import type { QaJourneyRunResult, QaJourneyStepSpec } from "../journey-types";

/**
 * Modelo del árbol de decisión de un recorrido (journey).
 *
 * El editor de pasos dice QUÉ se ejecuta; este modelo dice QUÉ PASA SEGÚN LA
 * RESPUESTA: en cada paso hay una bifurcación (¿el estado HTTP es el esperado?)
 * y unos datos que viajan al siguiente paso. Es geometría-agnóstico a propósito:
 * aquí sólo vive la lógica, el dibujo es de `journey-tree-diagram`.
 *
 * Las reglas replican exactamente las del runner (`journey-runner.ts`):
 * mismos códigos por defecto, mismo patrón de `{{variable}}` y el mismo hecho
 * incómodo de que en dry-run NO se extrae nada.
 */

/** Dónde se usa una variable dentro del paso. */
export type VariableSlot = "ruta" | "query" | "cuerpo" | "cabeceras";

export type VariableUse = Readonly<{ name: string; slot: VariableSlot }>;

export type ProducedVariable = Readonly<{ name: string; path: string }>;

/** Lo que la última corrida real dijo de este paso, si la hubo. */
export type RunFacts = Readonly<{
  httpStatus?: number;
  latencyMs?: number;
  passed: boolean;
  skipped?: string;
  error?: string;
}>;

export type JourneyTreeNode = Readonly<{
  index: number;
  key: string;
  name: string;
  endpointId: string;
  method: string;
  route: string;
  /** El endpoint existe en el catálogo (si no, método y ruta son desconocidos). */
  resolved: boolean;
  expected: readonly number[];
  produces: readonly ProducedVariable[];
  consumes: readonly VariableUse[];
  /** Variables usadas que ningún paso anterior extrae: nunca se resolverán. */
  orphanVars: readonly string[];
  mutating: boolean;
  destructive: boolean;
  run?: RunFacts;
}>;

/** Un dato que viaja de un paso a otro: la arista que convierte pasos en cadena. */
export type DataFlowEdge = Readonly<{
  from: number;
  to: number;
  variable: string;
}>;

export type JourneyTree = Readonly<{
  nodes: readonly JourneyTreeNode[];
  edges: readonly DataFlowEdge[];
}>;

/** Mismos códigos que asume el runner cuando el paso no declara los suyos. */
export const DEFAULT_EXPECTED_CODES = [200, 201, 202, 204] as const;

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function buildJourneyTree(
  steps: readonly QaJourneyStepSpec[],
  endpointsById: Map<string, EndpointItem>,
  lastRun?: QaJourneyRunResult | null,
): JourneyTree {
  const runByKey = new Map(
    (lastRun?.steps ?? []).map((step) => [step.key, toRunFacts(step)]),
  );
  // Índice "variable -> último paso que la extrae", que se va llenando conforme
  // avanzamos: una variable sólo puede venir de un paso ANTERIOR, igual que el
  // contexto del runner, que se construye en orden.
  const producedAt = new Map<string, number>();
  const nodes: JourneyTreeNode[] = [];
  const edges: DataFlowEdge[] = [];

  steps.forEach((step, index) => {
    const endpoint = endpointsById.get(step.endpointId);
    const consumes = collectUses(step);
    const orphanVars: string[] = [];

    for (const use of consumes) {
      const from = producedAt.get(rootName(use.name));
      if (from === undefined) {
        if (!orphanVars.includes(use.name)) orphanVars.push(use.name);
        continue;
      }
      const variable = rootName(use.name);
      if (
        !edges.some(
          (e) => e.from === from && e.to === index && e.variable === variable,
        )
      ) {
        edges.push({ from, to: index, variable });
      }
    }

    const produces = Object.entries(step.extract ?? {}).map(([name, path]) => ({
      name,
      path,
    }));
    const method = endpoint?.method?.toUpperCase() ?? "?";

    nodes.push({
      index,
      key: step.key,
      name: step.name?.trim() || step.key,
      endpointId: step.endpointId,
      method,
      route: endpoint?.fullPath ?? endpoint?.routePath ?? `#${step.endpointId}`,
      resolved: Boolean(endpoint),
      expected: step.expectedStatusCodes?.length
        ? step.expectedStatusCodes
        : [...DEFAULT_EXPECTED_CODES],
      produces,
      consumes,
      orphanVars,
      mutating: Boolean(endpoint) && !READ_METHODS.has(method),
      destructive: Boolean(endpoint?.isDestructive),
      run: runByKey.get(step.key),
    });

    for (const variable of produces) producedAt.set(variable.name, index);
  });

  return { nodes, edges };
}

/** Estado de un paso dentro de una simulación. */
export type NodeState = "pending" | "ok" | "failed" | "at-risk";

export type Simulation = Readonly<{
  states: readonly NodeState[];
  /** Variables que se quedan sin valor y viajan rotas al resto del recorrido. */
  brokenVars: readonly string[];
  firstFailure: number | null;
}>;

export type SimulationInput = Readonly<{
  failedKeys: ReadonlySet<string>;
  /** Último paso evaluado; los posteriores quedan "pending" (para la reproducción). */
  cursor: number;
  /** En dry-run el runner no extrae nada: ninguna variable llega resuelta. */
  dryRun: boolean;
}>;

/**
 * Propaga el efecto dominó. Ojo con la semántica real: el runner NO se detiene
 * en el primer fallo, sigue ejecutando. Lo que se rompe es el DATO: los pasos
 * que dependían de una extracción perdida salen con `{{variable}}` sin sustituir
 * — por eso el estado de esos pasos es "en riesgo" y no "fallado".
 */
export function simulateJourney(
  tree: JourneyTree,
  input: SimulationInput,
): Simulation {
  const broken = new Set<string>(
    input.dryRun
      ? tree.nodes.flatMap((node) => node.produces.map((v) => v.name))
      : [],
  );
  const states: NodeState[] = [];
  let firstFailure: number | null = null;

  for (const node of tree.nodes) {
    if (node.index > input.cursor) {
      states.push("pending");
      continue;
    }
    if (input.failedKeys.has(node.key)) {
      states.push("failed");
      if (firstFailure === null) firstFailure = node.index;
      for (const variable of node.produces) broken.add(variable.name);
      continue;
    }
    const usesBroken =
      node.orphanVars.length > 0 ||
      node.consumes.some((use) => broken.has(rootName(use.name)));
    if (usesBroken) {
      states.push("at-risk");
      // Un paso que sale con datos sin resolver tampoco extrae nada fiable:
      // el dominó continúa hacia sus propios consumidores.
      for (const variable of node.produces) broken.add(variable.name);
      continue;
    }
    states.push("ok");
  }

  return { states, brokenVars: [...broken], firstFailure };
}

/** Pasos que dejarían de recibir su dato si `index` fallara (cierre transitivo). */
export function impactedBy(tree: JourneyTree, index: number): number[] {
  const impacted = new Set<number>();
  const pending = [index];
  while (pending.length > 0) {
    const current = pending.pop() as number;
    for (const edge of tree.edges) {
      if (edge.from === current && !impacted.has(edge.to)) {
        impacted.add(edge.to);
        pending.push(edge.to);
      }
    }
  }
  return [...impacted].sort((a, b) => a - b);
}

export function rootName(variable: string): string {
  return variable.split(".")[0];
}

function toRunFacts(step: QaJourneyRunResult["steps"][number]): RunFacts {
  return {
    httpStatus: step.httpStatus,
    latencyMs: step.latencyMs,
    passed: step.passed,
    skipped: step.skipped,
    error: step.error,
  };
}

function collectUses(step: QaJourneyStepSpec): VariableUse[] {
  const uses: VariableUse[] = [];
  const scan = (value: unknown, slot: VariableSlot) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
        const name = match[1];
        if (!uses.some((use) => use.name === name && use.slot === slot)) {
          uses.push({ name, slot });
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) scan(item, slot);
      return;
    }
    if (value && typeof value === "object") {
      for (const item of Object.values(value)) scan(item, slot);
    }
  };

  scan(step.pathParams, "ruta");
  scan(step.queryParams, "query");
  scan(step.payload, "cuerpo");
  scan(step.headers, "cabeceras");
  return uses;
}
