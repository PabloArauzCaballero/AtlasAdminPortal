import { describe, expect, it } from "vitest";
import {
  buildLatencyTimeline,
  latencyStats,
  type LatencySample,
} from "@/features/qa-lab/latency-stats";

function sample(elapsedMs: number, latencyMs = 10, ok = true): LatencySample {
  return { ok, latencyMs, elapsedMs };
}

describe("latencyStats", () => {
  it("calcula percentiles sobre valores ordenados", () => {
    const stats = latencyStats([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(100);
    expect(stats.avg).toBe(55);
    expect(stats.p50).toBe(50);
  });

  it("no revienta con lista vacía", () => {
    const stats = latencyStats([]);
    expect(stats).toEqual({ avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 });
  });
});

describe("buildLatencyTimeline · agrupación", () => {
  it("agrupa por segundo y cuenta errores", () => {
    const timeline = buildLatencyTimeline([
      sample(0, 10),
      sample(500, 30),
      sample(1_200, 50, false),
    ]);

    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toMatchObject({ second: 0, count: 2, errorCount: 0 });
    expect(timeline[1]).toMatchObject({ second: 1, count: 1, errorCount: 1 });
  });

  it("devuelve los segundos ordenados", () => {
    const timeline = buildLatencyTimeline([
      sample(3_000),
      sample(1_000),
      sample(2_000),
    ]);
    expect(timeline.map((point) => point.second)).toEqual([1, 2, 3]);
  });
});

describe("buildLatencyTimeline · complejidad", () => {
  /**
   * Antes se recreaba el array del bucket en cada muestra (`[...bucket, s]`),
   * lo que hace O(n²) por segundo: 10.000 muestras en el mismo segundo eran
   * ~50M operaciones y congelaban la UI. Con push es O(n).
   *
   * El umbral es deliberadamente holgado: mide el salto de orden de magnitud,
   * no la velocidad de la máquina, para que no sea un test intermitente.
   */
  it("procesa 10.000 muestras en el mismo segundo sin degradarse", () => {
    const samples = Array.from({ length: 10_000 }, (_, index) =>
      sample(index % 900, index % 100),
    );

    const startedAt = performance.now();
    const timeline = buildLatencyTimeline(samples);
    const elapsedMs = performance.now() - startedAt;

    expect(timeline).toHaveLength(1);
    expect(timeline[0].count).toBe(10_000);
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it("procesa 20.000 muestras repartidas en muchos segundos", () => {
    const samples = Array.from({ length: 20_000 }, (_, index) =>
      sample(index * 10, index % 250),
    );

    const startedAt = performance.now();
    const timeline = buildLatencyTimeline(samples);
    const elapsedMs = performance.now() - startedAt;

    expect(timeline.length).toBeGreaterThan(100);
    expect(elapsedMs).toBeLessThan(2_000);
  });
});
