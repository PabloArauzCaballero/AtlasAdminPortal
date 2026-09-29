import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  JourneyBatchResults,
  filterIterations,
} from "@/features/qa-lab/journey-batch-results";
import type {
  QaJourneyBatchResult,
  QaJourneyRunResult,
} from "@/features/qa-lab/journey-types";
import { elegirOpcion } from "../../shared/option-select-helpers";

const RUN: QaJourneyRunResult = {
  startedAt: "2026-07-17T10:00:00.000Z",
  finishedAt: "2026-07-17T10:00:01.000Z",
  totalSteps: 1,
  passedSteps: 1,
  failedSteps: 0,
  context: {},
  steps: [],
};

function batch(count: number, failing: number[] = []): QaJourneyBatchResult {
  return {
    iterations: count,
    concurrency: 2,
    seed: "qa-base",
    startedAt: RUN.startedAt,
    finishedAt: RUN.finishedAt,
    passedIterations: count - failing.length,
    failedIterations: failing.length,
    runs: Array.from({ length: count }, (_, index) => ({
      index,
      persona: { documentNumber: `DOC-${1000 + index}` },
      result: failing.includes(index)
        ? { ...RUN, passedSteps: 0, failedSteps: 1 }
        : RUN,
    })),
  };
}

describe("JourneyBatchResults · filtros sobre el lote entero", () => {
  it("el filtro «Resultado» deja sólo las personas con fallos", async () => {
    render(<JourneyBatchResults batch={batch(6, [4])} />);
    expect(screen.getAllByText(/^Persona \d$/)).toHaveLength(6);

    await elegirOpcion(
      screen.getByRole("combobox", { name: "Resultado" }),
      "ERROR",
    );
    await waitFor(() =>
      expect(screen.getAllByText(/^Persona \d$/)).toHaveLength(1),
    );
    expect(screen.getByText("Persona 5")).toBeInTheDocument();
  });

  it("busca por parte del documento, entre todas las páginas", async () => {
    render(<JourneyBatchResults batch={batch(60)} />);
    // Sólo 25 filas por página, pero la búsqueda recorre las 60.
    expect(screen.getAllByText(/^Persona \d+$/)).toHaveLength(25);
    await userEvent.type(
      screen.getByLabelText("Buscar por n.º de persona o documento…"),
      "DOC-1059",
    );
    await waitFor(() =>
      expect(screen.getAllByText(/^Persona \d+$/)).toHaveLength(1),
    );
    expect(screen.getByText("Persona 60")).toBeInTheDocument();
  });

  it("pagina de 25 en 25 y enseña el total", async () => {
    render(<JourneyBatchResults batch={batch(60)} />);
    expect(screen.getByText("60")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("Persona 26")).toBeInTheDocument();
    expect(screen.queryByText("Persona 1")).not.toBeInTheDocument();
  });

  it("sin coincidencias dice que nada coincide", async () => {
    render(<JourneyBatchResults batch={batch(3)} />);
    await userEvent.type(
      screen.getByLabelText("Buscar por n.º de persona o documento…"),
      "zzz",
    );
    expect(
      await screen.findByText("Ninguna persona coincide con la búsqueda."),
    ).toBeInTheDocument();
  });

  it("filterIterations entiende «#3», «3» y el documento", () => {
    const runs = batch(5).runs;
    expect(filterIterations(runs, "#3", "").map((r) => r.index)).toEqual([2]);
    // Sin «#», el 3 también se busca dentro del documento (DOC-1003).
    expect(filterIterations(runs, "3", "").map((r) => r.index)).toEqual([2, 3]);
    expect(filterIterations(runs, "1004", "").map((r) => r.index)).toEqual([4]);
  });
});
