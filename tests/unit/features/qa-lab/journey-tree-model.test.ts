import { describe, expect, it } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import {
  buildJourneyTree,
  impactedBy,
  simulateJourney,
} from "@/features/qa-lab/journey-tree/journey-tree-model";
import type { QaJourneyStepSpec } from "@/features/qa-lab/journey-types";
import { endpointFixture } from "./endpoint-fixture";

const STEPS: QaJourneyStepSpec[] = [
  {
    key: "start",
    name: "Iniciar onboarding",
    endpointId: "ep-post",
    payload: { channel: "mobile_app" },
    expectedStatusCodes: [200, 201],
    extract: { customerId: "data.customerId" },
  },
  {
    key: "summary",
    endpointId: "ep-get",
    pathParams: { customerId: "{{customerId}}" },
    expectedStatusCodes: [200],
  },
  {
    key: "session",
    endpointId: "ep-post",
    payload: { customer: { id: "{{customerId}}" }, note: "{{ticketId}}" },
  },
];

function catalog(): Map<string, EndpointItem> {
  return new Map<string, EndpointItem>([
    [
      "ep-post",
      endpointFixture({
        endpointId: "ep-post",
        method: "POST",
        fullPath: "/api/v1/customer-onboarding/start",
      }),
    ],
    [
      "ep-get",
      endpointFixture({
        endpointId: "ep-get",
        method: "GET",
        fullPath: "/api/v1/customers/:customerId",
      }),
    ],
  ]);
}

describe("buildJourneyTree · lectura del recorrido", () => {
  it("resuelve método y ruta contra el catálogo", () => {
    const tree = buildJourneyTree(STEPS, catalog());

    expect(tree.nodes[0].method).toBe("POST");
    expect(tree.nodes[1].route).toBe("/api/v1/customers/:customerId");
    expect(tree.nodes.every((node) => node.resolved)).toBe(true);
  });

  it("un endpointId fuera del catálogo se marca sin resolver, no se inventa", () => {
    const tree = buildJourneyTree(
      [{ key: "a", endpointId: "fantasma" }],
      catalog(),
    );

    expect(tree.nodes[0].resolved).toBe(false);
    expect(tree.nodes[0].method).toBe("?");
  });

  it("aplica los códigos por defecto del runner cuando el paso no los declara", () => {
    const tree = buildJourneyTree(STEPS, catalog());

    expect(tree.nodes[2].expected).toEqual([200, 201, 202, 204]);
  });

  it("encuentra las variables usadas y dónde se usan", () => {
    const tree = buildJourneyTree(STEPS, catalog());

    expect(tree.nodes[1].consumes).toEqual([
      { name: "customerId", slot: "ruta" },
    ]);
    // Anidada dentro del cuerpo: el runner también sustituye en profundidad.
    expect(tree.nodes[2].consumes).toContainEqual({
      name: "customerId",
      slot: "cuerpo",
    });
  });

  it("encadena el dato con el paso que lo extrae", () => {
    const tree = buildJourneyTree(STEPS, catalog());

    expect(tree.edges).toEqual([
      { from: 0, to: 1, variable: "customerId" },
      { from: 0, to: 2, variable: "customerId" },
    ]);
  });

  it("señala la variable que nadie extrae en vez de dibujar una flecha falsa", () => {
    const tree = buildJourneyTree(STEPS, catalog());

    expect(tree.nodes[2].orphanVars).toEqual(["ticketId"]);
    expect(tree.edges.some((edge) => edge.variable === "ticketId")).toBe(false);
  });

  it("una variable solo puede venir de un paso anterior", () => {
    // El contexto del runner se llena en orden: usarla antes es usarla vacía.
    const tree = buildJourneyTree(
      [
        { key: "usa", endpointId: "ep-get", pathParams: { id: "{{token}}" } },
        { key: "produce", endpointId: "ep-post", extract: { token: "data.t" } },
      ],
      catalog(),
    );

    expect(tree.edges).toEqual([]);
    expect(tree.nodes[0].orphanVars).toEqual(["token"]);
  });

  it("marca los pasos que escriben para no lanzarlos a ciegas", () => {
    const tree = buildJourneyTree(STEPS, catalog());

    expect(tree.nodes.map((node) => node.mutating)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it("cuelga de cada paso lo que dijo la última corrida", () => {
    const tree = buildJourneyTree(STEPS, catalog(), {
      startedAt: "2026-07-28T10:00:00.000Z",
      finishedAt: "2026-07-28T10:00:02.000Z",
      totalSteps: 1,
      passedSteps: 0,
      failedSteps: 1,
      context: {},
      steps: [
        {
          key: "start",
          name: "Iniciar onboarding",
          endpointId: "ep-post",
          method: "POST",
          url: "http://localhost:3005/api/v1/customer-onboarding/start",
          httpStatus: 500,
          ok: false,
          passed: false,
          latencyMs: 42,
          extracted: {},
        },
      ],
    });

    expect(tree.nodes[0].run).toMatchObject({ httpStatus: 500, passed: false });
    expect(tree.nodes[1].run).toBeUndefined();
  });
});

describe("simulateJourney · efecto dominó", () => {
  const tree = buildJourneyTree(STEPS, catalog());
  const all = { cursor: Number.MAX_SAFE_INTEGER, dryRun: false };

  it("sin fallos, los pasos con sus datos resueltos pasan", () => {
    const result = simulateJourney(tree, { ...all, failedKeys: new Set() });

    // El paso 3 usa `ticketId`, que nadie extrae: nace en riesgo.
    expect(result.states).toEqual(["ok", "ok", "at-risk"]);
    expect(result.firstFailure).toBeNull();
  });

  it("un paso fallido no detiene el recorrido: rompe el dato aguas abajo", () => {
    const result = simulateJourney(tree, {
      ...all,
      failedKeys: new Set(["start"]),
    });

    expect(result.states).toEqual(["failed", "at-risk", "at-risk"]);
    expect(result.firstFailure).toBe(0);
    expect(result.brokenVars).toContain("customerId");
  });

  it("en dry-run no se extrae nada, así que nada llega encadenado", () => {
    const result = simulateJourney(tree, {
      cursor: Number.MAX_SAFE_INTEGER,
      dryRun: true,
      failedKeys: new Set(),
    });

    expect(result.states).toEqual(["ok", "at-risk", "at-risk"]);
  });

  it("el cursor deja pendientes los pasos aún no evaluados", () => {
    const result = simulateJourney(tree, {
      cursor: 0,
      dryRun: false,
      failedKeys: new Set(),
    });

    expect(result.states).toEqual(["ok", "pending", "pending"]);
  });
});

describe("impactedBy · alcance de un fallo", () => {
  it("devuelve los pasos que dependen del dato, directa o indirectamente", () => {
    const tree = buildJourneyTree(
      [
        { key: "a", endpointId: "ep-post", extract: { id: "data.id" } },
        {
          key: "b",
          endpointId: "ep-post",
          pathParams: { id: "{{id}}" },
          extract: { token: "data.token" },
        },
        { key: "c", endpointId: "ep-get", headers: { auth: "{{token}}" } },
      ],
      catalog(),
    );

    expect(impactedBy(tree, 0)).toEqual([1, 2]);
    expect(impactedBy(tree, 2)).toEqual([]);
  });
});
