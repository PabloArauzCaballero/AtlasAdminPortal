import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { statusTone } from "@/shared/components/ui/badges";
import { JourneyStepResults } from "@/features/qa-lab/journey-step-results";
import type {
  QaJourneyRunResult,
  QaJourneyStepResult,
} from "@/features/qa-lab/journey-types";

function stepResult(
  overrides: Partial<QaJourneyStepResult> = {},
): QaJourneyStepResult {
  return {
    key: "health",
    name: "Health check",
    endpointId: "ep-1",
    method: "GET",
    url: "http://localhost:3005/api/v1/health",
    httpStatus: 200,
    ok: true,
    passed: true,
    latencyMs: 12,
    extracted: {},
    ...overrides,
  };
}

function runResult(
  steps: QaJourneyStepResult[],
  overrides: Partial<QaJourneyRunResult> = {},
): QaJourneyRunResult {
  const passedSteps = steps.filter((step) => step.passed).length;
  return {
    startedAt: "2026-07-17T10:00:00.000Z",
    finishedAt: "2026-07-17T10:00:01.000Z",
    totalSteps: steps.length,
    passedSteps,
    failedSteps: steps.length - passedSteps,
    context: {},
    steps,
    ...overrides,
  };
}

const TONE_BY_CLASS: ReadonlyArray<[string, string]> = [
  ["bg-emerald-50", "success"],
  ["bg-amber-50", "warning"],
  ["bg-red-50", "critical"],
  ["bg-slate-100", "muted"],
  ["bg-slate-50", "default"],
];

function isBadge(element: HTMLElement): boolean {
  return TONE_BY_CLASS.some(([className]) =>
    element.classList.contains(className),
  );
}

function toneOf(badge: HTMLElement): string {
  const found = TONE_BY_CLASS.find(([className]) =>
    badge.classList.contains(className),
  );
  return found ? found[1] : "default";
}

/**
 * El tono solo existe como clase de Tailwind; se traduce de vuelta a su nombre
 * semántico para que las aserciones digan "ERROR es rojo" y no una clase.
 *
 * El veredicto global y el de cada paso usan los mismos literales ("OK"), y el
 * `JsonViewer` del final repite el resultado crudo, así que hay que separar el
 * badge de cabecera (fuera de la lista) de los de cada `<li>`.
 */
function toneOfVerdict(text: string): string {
  const badges = screen
    .getAllByText(text)
    .filter((element) => isBadge(element) && !element.closest("li"));
  if (badges.length !== 1) {
    throw new Error(
      `Se esperaba un único veredicto "${text}", hay ${badges.length}.`,
    );
  }
  return toneOf(badges[0]);
}

function toneOfStepBadge(text: string, stepIndex = 0): string {
  const badges = within(screen.getAllByRole("listitem")[stepIndex])
    .getAllByText(text)
    .filter(isBadge);
  return toneOf(badges[0]);
}

describe("JourneyStepResults · veredicto global", () => {
  it("un journey sin fallos se declara OK en verde", () => {
    render(<JourneyStepResults result={runResult([stepResult()])} />);

    expect(toneOfVerdict("OK")).toBe("success");
  });

  it("un journey con fallos NO se pinta neutro (RESUELTO_ATLAS_F3_R10_BADGES)", () => {
    // El bug: `WARNING` no estaba en la tabla de tonos y caía en gris, así que
    // un journey con pasos rotos se leía igual que uno sin ejecutar.
    render(
      <JourneyStepResults
        result={runResult([stepResult({ passed: false, ok: false })])}
      />,
    );

    expect(screen.getByText("WARNING")).toBeInTheDocument();
    expect(toneOfVerdict("WARNING")).toBe("warning");
    expect(statusTone("WARNING")).not.toBe("default");
  });

  it("informa cuántos pasos pasaron sobre el total", () => {
    render(
      <JourneyStepResults
        result={runResult([
          stepResult({ key: "a" }),
          stepResult({ key: "b", passed: false }),
          stepResult({ key: "c" }),
        ])}
      />,
    );

    expect(screen.getByText("2/3 pasos OK")).toBeInTheDocument();
  });
});

describe("JourneyStepResults · por paso", () => {
  it("numera los pasos en el orden de ejecución", () => {
    render(
      <JourneyStepResults
        result={runResult([
          stepResult({ key: "a", name: "Login" }),
          stepResult({ key: "b", name: "Onboarding" }),
        ])}
      />,
    );

    expect(screen.getByText("1. Login")).toBeInTheDocument();
    expect(screen.getByText("2. Onboarding")).toBeInTheDocument();
  });

  it("un paso fallido se marca ERROR en rojo y muestra el motivo", () => {
    // El motivo del fallo es lo único accionable del informe: si no se pinta,
    // el operador ve un journey rojo sin saber por qué.
    render(
      <JourneyStepResults
        result={runResult([
          stepResult({
            passed: false,
            ok: false,
            httpStatus: 500,
            error: "HTTP 500 fuera de los esperados [200]",
          }),
        ])}
      />,
    );

    expect(toneOfStepBadge("ERROR")).toBe("critical");
    expect(
      screen.getByText("HTTP 500 fuera de los esperados [200]"),
    ).toBeInTheDocument();
  });

  it("un paso omitido lo dice y no finge un estado OK/ERROR", () => {
    render(
      <JourneyStepResults
        result={runResult([
          stepResult({
            passed: false,
            skipped: "Falta la variable {{customerId}} del paso previo.",
            httpStatus: undefined,
            latencyMs: undefined,
          }),
        ])}
      />,
    );

    expect(screen.getByText("omitido")).toBeInTheDocument();
    expect(
      screen.getByText("Falta la variable {{customerId}} del paso previo."),
    ).toBeInTheDocument();
    expect(screen.queryByText("ERROR")).toBeNull();
    expect(screen.queryByText("OK")).toBeNull();
  });

  it("muestra HTTP y latencia del paso ejecutado", () => {
    render(
      <JourneyStepResults
        result={runResult([stepResult({ httpStatus: 201, latencyMs: 87 })])}
      />,
    );

    expect(screen.getByText("HTTP 201")).toBeInTheDocument();
    expect(screen.getByText("87 ms")).toBeInTheDocument();
  });

  it("latencia 0 ms se muestra (no se confunde con 'sin medir')", () => {
    // `latencyMs !== undefined` y no `latencyMs ?`: un 0 es un dato real.
    render(
      <JourneyStepResults result={runResult([stepResult({ latencyMs: 0 })])} />,
    );

    expect(screen.getByText("0 ms")).toBeInTheDocument();
  });

  it("un paso sin variables extraídas no pinta la línea de extracción", () => {
    render(<JourneyStepResults result={runResult([stepResult()])} />);

    expect(screen.queryByText(/extraído:/)).toBeNull();
  });

  it("lista las variables extraídas que alimentan los pasos siguientes", () => {
    render(
      <JourneyStepResults
        result={runResult([
          stepResult({ extracted: { customerId: "c-9", tries: 2 } }),
        ])}
      />,
    );

    expect(
      screen.getByText('extraído: customerId="c-9", tries=2'),
    ).toBeInTheDocument();
  });
});
