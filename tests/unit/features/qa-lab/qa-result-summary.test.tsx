import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  RunResultSummary,
  StressResultSummary,
} from "@/features/qa-lab/qa-result-summary";
import type {
  DirectRunResult,
  DirectStressResult,
} from "@/features/qa-lab/types";

const CHECKS = [
  {
    name: "Estado HTTP esperado",
    passed: true,
    expected: "200",
    actual: "200",
  },
  {
    name: "Latencia maxima",
    passed: false,
    expected: "<= 500 ms",
    actual: "900",
  },
];

describe("resultado de una prueba · comprobaciones como tabla", () => {
  it("la prueba funcional pinta sus checks con cabeceras y un veredicto por fila", () => {
    const result = {
      ok: false,
      method: "GET",
      url: "http://x/api",
      httpStatus: 200,
      latencyMs: 900,
      assertions: {
        passed: false,
        total: 2,
        passedCount: 1,
        failedCount: 1,
        items: CHECKS,
      },
    } as unknown as DirectRunResult;
    render(<RunResultSummary result={result} />);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Comprobación", "Obtenido", "Esperado", "Resultado"]);
    const failed = screen
      .getByText("Latencia maxima")
      .closest("tr") as HTMLElement;
    expect(within(failed).getByText("revisar")).toBeInTheDocument();
    expect(within(failed).getByText("<= 500 ms")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("la prueba de carga pinta sus umbrales en la misma tabla", () => {
    const result = {
      dryRun: false,
      errorCount: 0,
      method: "GET",
      totalRequests: 10,
      throughputRps: 5,
      p95LatencyMs: 40,
      errorRate: 0,
      url: "http://x/api",
      thresholds: [CHECKS[0]],
      warnings: [],
    } as unknown as DirectStressResult;
    render(<StressResultSummary result={result} />);

    const row = screen
      .getByText("Estado HTTP esperado")
      .closest("tr") as HTMLElement;
    expect(within(row).getByText("OK")).toBeInTheDocument();
  });
});
