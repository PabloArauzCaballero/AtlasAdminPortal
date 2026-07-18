import { describe, expect, it } from "vitest";
import {
  normalizeStressPlan,
  type StressPlan,
} from "@/features/qa-lab/stress-plan";
import {
  buildStressResult,
  dryRunStressResult,
  type StressRequestSample,
} from "@/features/qa-lab/stress-result";
import type {
  DirectStressInput,
  DirectStressResult,
} from "@/features/qa-lab/types";

const REAL_ACCESS_TOKEN = "real-session-token-do-not-leak";

function stressInput(
  overrides: Record<string, unknown> = {},
): DirectStressInput {
  return {
    targetRps: 10,
    durationSeconds: 5,
    concurrency: 2,
    rampUpSeconds: 0,
    maxRequests: 100,
    dryRun: false,
    ...overrides,
  } as unknown as DirectStressInput;
}

function builtFixture(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://api.atlas.internal/api/v1/internal/users",
    method: "GET",
    headers: { Authorization: `Bearer ${REAL_ACCESS_TOKEN}` },
    ...overrides,
  };
}

function planFixture(overrides: Record<string, unknown> = {}): StressPlan {
  return normalizeStressPlan(stressInput(overrides));
}

function sample(
  overrides: Partial<StressRequestSample> = {},
): StressRequestSample {
  return {
    ok: true,
    latencyMs: 10,
    elapsedMs: 0,
    statusKey: "200",
    ...overrides,
  };
}

function buildFor(
  samples: StressRequestSample[],
  overrides: {
    input?: Record<string, unknown>;
    durationMs?: number;
    plan?: StressPlan;
    warnings?: string[];
  } = {},
): DirectStressResult {
  const { input, ...rest } = overrides;
  return buildStressResult({
    built: builtFixture(),
    plan: planFixture(),
    durationMs: 1_000,
    warnings: [],
    ...rest,
    input: stressInput(input),
    samples,
  });
}

const NUMERIC_FIELDS = [
  "totalRequests",
  "successCount",
  "errorCount",
  "avgLatencyMs",
  "p50LatencyMs",
  "p95LatencyMs",
  "p99LatencyMs",
  "minLatencyMs",
  "maxLatencyMs",
  "errorRate",
  "throughputRps",
] as const;

describe("dryRunStressResult", () => {
  it("no inventa métricas de un run que no ha ocurrido", () => {
    const result = dryRunStressResult(builtFixture(), planFixture(), []);
    expect(result.dryRun).toBe(true);
    for (const field of NUMERIC_FIELDS) {
      if (field === "totalRequests") continue;
      expect(result[field], field).toBe(0);
    }
    expect(result.latencyTimeline).toEqual([]);
    expect(result.statusCounts).toEqual({});
  });

  it("anticipa cuántas requests se lanzarían", () => {
    const plan = planFixture({ targetRps: 10, durationSeconds: 5 });
    expect(dryRunStressResult(builtFixture(), plan, []).totalRequests).toBe(50);
  });

  /**
   * El preview del dry-run se renderiza en pantalla: si el token de sesión
   * viajara sin redactar, bastaría una captura para filtrarlo.
   */
  it("nunca expone el token de sesión en el preview", () => {
    const result = dryRunStressResult(builtFixture(), planFixture(), []);
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });

  it("marca capped cuando el plan se recortó al máximo", () => {
    const plan = planFixture({
      targetRps: 100,
      durationSeconds: 60,
      maxRequests: 250,
    });
    expect(dryRunStressResult(builtFixture(), plan, []).capped).toBe(true);
  });

  it("no marca capped cuando el plan cabe entero", () => {
    expect(dryRunStressResult(builtFixture(), planFixture(), []).capped).toBe(
      false,
    );
  });

  it("conserva los avisos para que el operador los vea antes de correr", () => {
    const result = dryRunStressResult(builtFixture(), planFixture(), ["aviso"]);
    expect(result.warnings).toEqual(["aviso"]);
  });
});

describe("buildStressResult · agregación sin muestras", () => {
  /**
   * El clásico de este módulo: dividir entre `samples.length` sin guarda deja
   * NaN en toda la tarjeta de resultados (NaN se renderiza y no salta ningún
   * error).
   */
  it("cero muestras no produce NaN en ninguna métrica", () => {
    const result = buildFor([]);
    for (const field of NUMERIC_FIELDS) {
      expect(
        Number.isFinite(result[field]),
        `${field} = ${result[field]}`,
      ).toBe(true);
    }
  });

  it("cero muestras reporta cero requests, no el plan", () => {
    expect(buildFor([]).totalRequests).toBe(0);
  });

  it("una duración de cero no produce Infinity en el throughput", () => {
    const result = buildFor([sample()], { durationMs: 0 });
    expect(Number.isFinite(result.throughputRps)).toBe(true);
    expect(result.throughputRps).toBe(0);
  });

  /**
   * COMPORTAMIENTO FIJADO, NO DESEADO (ver informe): sin muestras el errorRate
   * es 0, así que el umbral de error rate PASA en un run donde no se completó
   * ni una request. El de throughput mínimo sí lo caza. Que "0 de 0 requests
   * fallaron" cuente como éxito es una decisión de producto, no un bug obvio.
   */
  it("sin muestras el umbral de error rate pasa (fijado)", () => {
    const result = buildFor([], { input: { maxErrorRate: 0.01 } });
    expect(result.thresholds[0]).toMatchObject({
      name: "Error rate",
      passed: true,
    });
  });

  it("sin muestras el umbral de throughput mínimo sí falla", () => {
    const result = buildFor([], { input: { minThroughputRps: 5 } });
    expect(result.thresholds[0]).toMatchObject({
      name: "Throughput minimo",
      passed: false,
    });
  });
});

describe("buildStressResult · agregación con muestras", () => {
  it("una única muestra deja todos los percentiles en su latencia", () => {
    const result = buildFor([sample({ latencyMs: 42 })]);
    expect(result).toMatchObject({
      totalRequests: 1,
      avgLatencyMs: 42,
      p50LatencyMs: 42,
      p95LatencyMs: 42,
      p99LatencyMs: 42,
      minLatencyMs: 42,
      maxLatencyMs: 42,
    });
  });

  it("separa aciertos de errores", () => {
    const result = buildFor([
      sample({ ok: true }),
      sample({ ok: false }),
      sample({ ok: true }),
    ]);
    expect(result).toMatchObject({ successCount: 2, errorCount: 1 });
    expect(result.errorRate).toBeCloseTo(1 / 3);
  });

  it("un run donde todo falla reporta errorRate 1, no 0", () => {
    const result = buildFor([
      sample({ ok: false, statusKey: "500" }),
      sample({ ok: false, statusKey: "500" }),
    ]);
    expect(result.errorRate).toBe(1);
    expect(result.successCount).toBe(0);
  });

  it("cuenta las respuestas por estado", () => {
    const result = buildFor([
      sample({ statusKey: "200" }),
      sample({ statusKey: "200" }),
      sample({ ok: false, statusKey: "Timeout" }),
    ]);
    expect(result.statusCounts).toEqual({ "200": 2, Timeout: 1 });
  });

  it("calcula el throughput sobre la duración real, no la planificada", () => {
    const result = buildFor([sample(), sample(), sample(), sample()], {
      durationMs: 2_000,
    });
    expect(result.throughputRps).toBe(2);
  });

  it("agrupa la timeline por segundo de la muestra", () => {
    const result = buildFor([
      sample({ elapsedMs: 100 }),
      sample({ elapsedMs: 900 }),
      sample({ ok: false, elapsedMs: 1_500 }),
    ]);
    expect(result.latencyTimeline.map((point) => point.second)).toEqual([0, 1]);
    expect(result.latencyTimeline[1].errorCount).toBe(1);
  });

  it("nunca expone el token de sesión en el resultado", () => {
    const result = buildFor([sample()]);
    expect(JSON.stringify(result)).not.toContain(REAL_ACCESS_TOKEN);
  });
});

describe("buildStressResult · umbrales", () => {
  it("no evalúa ningún umbral si el operador no pidió ninguno", () => {
    expect(buildFor([sample()]).thresholds).toEqual([]);
  });

  it("un umbral de error rate en 0 se evalúa, no se ignora por ser falsy", () => {
    const result = buildFor([sample({ ok: false })], {
      input: { maxErrorRate: 0 },
    });
    expect(result.thresholds).toHaveLength(1);
    expect(result.thresholds[0].passed).toBe(false);
  });

  it("el umbral de error rate pasa cuando se cumple", () => {
    const result = buildFor(
      [sample(), sample(), sample(), sample({ ok: false })],
      { input: { maxErrorRate: 0.5 } },
    );
    expect(result.thresholds[0].passed).toBe(true);
  });

  it("evalúa p95, p99 y media contra las latencias medidas", () => {
    const samples = Array.from({ length: 100 }, (_, index) =>
      sample({ latencyMs: index + 1 }),
    );
    const result = buildFor(samples, {
      input: { maxP95Ms: 50, maxP99Ms: 200, maxAvgMs: 200 },
    });
    const byName = Object.fromEntries(
      result.thresholds.map((item) => [item.name, item.passed]),
    );
    // p95 real = 95 ms, por encima de los 50 pactados.
    expect(byName["p95 latency"]).toBe(false);
    expect(byName["p99 latency"]).toBe(true);
    expect(byName["Avg latency"]).toBe(true);
  });

  it("el throughput mínimo se compara con >=, no con >", () => {
    const result = buildFor([sample(), sample()], {
      durationMs: 1_000,
      input: { minThroughputRps: 2 },
    });
    expect(result.thresholds[0].passed).toBe(true);
  });

  it("evalúa todos los umbrales pedidos y sólo esos", () => {
    const result = buildFor([sample()], {
      input: { maxErrorRate: 0.1, maxP95Ms: 100 },
    });
    expect(result.thresholds.map((item) => item.name)).toEqual([
      "Error rate",
      "p95 latency",
    ]);
  });
});
