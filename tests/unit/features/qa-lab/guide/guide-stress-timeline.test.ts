import { describe, expect, it } from "vitest";
import {
  buildDemoTimeline,
  buildPath,
  TOTAL_SECONDS,
} from "@/features/qa-lab/guide/guide-stress-timeline";

describe("guide-stress-timeline · datos deterministas", () => {
  it("cubre un punto por segundo del rango completo", () => {
    const timeline = buildDemoTimeline();

    expect(timeline).toHaveLength(TOTAL_SECONDS + 1);
    expect(timeline[0].second).toBe(0);
    expect(timeline[TOTAL_SECONDS].second).toBe(TOTAL_SECONDS);
  });

  it("el p95 nunca queda por debajo del promedio y los errores aparecen al saturar", () => {
    const timeline = buildDemoTimeline();

    for (const point of timeline) {
      expect(point.p95LatencyMs).toBeGreaterThanOrEqual(point.avgLatencyMs);
    }
    expect(timeline[10].errorCount).toBe(0);
    expect(timeline[TOTAL_SECONDS].errorCount).toBeGreaterThan(0);
  });

  it("buildPath produce un trazo SVG que arranca con un moveto", () => {
    const timeline = buildDemoTimeline();

    const path = buildPath(timeline, TOTAL_SECONDS, 500, "p95LatencyMs");

    expect(path.startsWith("M ")).toBe(true);
    expect(path).toContain("L ");
  });
});
