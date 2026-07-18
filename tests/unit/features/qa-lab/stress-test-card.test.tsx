import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import type { DirectStressResult } from "@/features/qa-lab/types";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const hasPermission = vi.hoisted(() => vi.fn());
const useEndpointStressMutation = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasPermission }),
}));
vi.mock("@/features/qa-lab/hooks", () => ({ useEndpointStressMutation }));

const { StressTestCard } = await import("@/features/qa-lab/stress-test-card");

const mutate = vi.fn();

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    mutate,
    isPending: false,
    error: null,
    data: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  mutate.mockReset();
  mutate.mockImplementation(() => undefined);
  hasPermission.mockReturnValue(true);
  useEndpointStressMutation.mockReturnValue(mutationState());
});

const HEALTH = endpointFixture({
  endpointId: "ep-1",
  fullPath: "/api/v1/health",
});

function runButton() {
  return screen.getByRole("button", { name: /stress$/ });
}

async function selectProduction() {
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: /Ambiente/ }),
    "PRODUCTION_READONLY",
  );
}

function stressResult(
  overrides: Partial<DirectStressResult> = {},
): DirectStressResult {
  return {
    url: "http://localhost:3005/api/v1/health",
    method: "GET",
    dryRun: true,
    totalRequests: 150,
    successCount: 150,
    errorCount: 0,
    avgLatencyMs: 40,
    p50LatencyMs: 38,
    p95LatencyMs: 90,
    p99LatencyMs: 120,
    minLatencyMs: 10,
    maxLatencyMs: 130,
    errorRate: 0,
    throughputRps: 5,
    requestedTargetRps: 5,
    plannedRequests: 150,
    durationMs: 30000,
    capped: false,
    statusCounts: { "200": 150 },
    requestHeaders: {},
    warnings: [],
    thresholds: [],
    latencyTimeline: [
      {
        second: 0,
        count: 5,
        errorCount: 0,
        avgLatencyMs: 40,
        p50LatencyMs: 38,
        p95LatencyMs: 90,
        maxLatencyMs: 130,
      },
    ],
    ...overrides,
  };
}

describe("StressTestCard · bloqueo de producción", () => {
  it("en producción el stress queda bloqueado y se explica por qué", async () => {
    // El backend también lo bloquea, pero el operador tiene que entender el
    // botón muerto sin abrir la consola de red.
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    await selectProduction();

    expect(screen.getByText("Stress bloqueado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No se permiten pruebas de stress desde la interfaz en producción.",
      ),
    ).toBeInTheDocument();
    expect(runButton()).toBeDisabled();
  });

  it("en producción ni siquiera se puede abrir la confirmación", async () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await selectProduction();

    await userEvent.click(runButton());

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("volviendo a STAGING se desbloquea y el aviso desaparece", async () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await selectProduction();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Ambiente/ }),
      "STAGING",
    );

    expect(screen.queryByText("Stress bloqueado")).toBeNull();
    expect(runButton()).toBeEnabled();
  });

  it("LOCAL y STAGING no están bloqueados de salida", () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(screen.queryByText("Stress bloqueado")).toBeNull();
    expect(runButton()).toBeEnabled();
  });
});

describe("StressTestCard · permiso y endpoint", () => {
  it("sin el permiso de stress no se puede ejecutar", () => {
    hasPermission.mockImplementation(
      (permission: string) => permission !== "systems.stress.execute",
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(runButton()).toBeDisabled();
  });

  it("sin endpoint elegido no se puede ejecutar", () => {
    render(<StressTestCard endpointId="" />);

    expect(runButton()).toBeDisabled();
  });

  it("con una corrida en vuelo no se puede relanzar", () => {
    useEndpointStressMutation.mockReturnValue(
      mutationState({ isPending: true }),
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(runButton()).toBeDisabled();
  });

  it("comprueba el permiso propio del stress, no el de la prueba funcional", () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(hasPermission).toHaveBeenCalledWith("systems.stress.execute");
  });
});

describe("StressTestCard · confirmación", () => {
  it("arranca en dry-run y lo dice el botón", () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.getByRole("button", { name: "Previsualizar stress" }),
    ).toBeInTheDocument();
  });

  it("la confirmación resume el plan de carga que se va a lanzar", async () => {
    // Es el último momento para ver "500 RPS durante 1 hora" antes de lanzarlo.
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    await userEvent.click(runButton());

    expect(
      within(screen.getByRole("dialog")).getByText(
        "Se previsualizará stress contra el endpoint #ep-1: 5 RPS, 5 concurrencia, 30s.",
      ),
    ).toBeInTheDocument();
  });

  it("confirmar lanza la corrida con el plan configurado", async () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(mutate.mock.calls[0][0]).toMatchObject({
      dryRun: true,
      targetRps: 5,
      durationSeconds: 30,
      concurrency: 5,
    });
  });

  it("cancelar no lanza nada", async () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("StressTestCard · errores visibles (RESUELTO_ATLAS_F1_R7)", () => {
  it("un formulario inválido se rechaza ANTES de abrir el diálogo, y se lee", async () => {
    // Con el diálogo abierto encima, su backdrop `z-50` tapa el `ErrorState`
    // de la card: el clic parecería no hacer nada.
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);
    const payload = screen.getByRole("textbox", { name: /Payload base/ });
    await userEvent.clear(payload);
    await userEvent.type(payload, "no soy json");

    await userEvent.click(runButton());

    expect(screen.getByText("Formulario inválido")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("un fallo del stress se lee: el diálogo se aparta en vez de taparlo", async () => {
    const fallo = new AtlasApiError({
      status: 429,
      code: "QA_STRESS_REJECTED",
      message: "El backend rechazó la ráfaga.",
      requestId: "req-3",
    });
    mutate.mockImplementation(
      (_input: unknown, options: { onError?: (error: unknown) => void }) => {
        useEndpointStressMutation.mockReturnValue(
          mutationState({ error: fallo }),
        );
        options?.onError?.(fallo);
      },
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(
      screen.getByText("El backend rechazó la ráfaga."),
    ).toBeInTheDocument();
    expect(screen.getByText(/req-3/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("un fallo sin forma de error del API igual se explica", () => {
    useEndpointStressMutation.mockReturnValue(
      mutationState({ error: new TypeError("Failed to fetch") }),
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.getByText("No se pudo ejecutar el stress run."),
    ).toBeInTheDocument();
  });
});

describe("StressTestCard · resultado", () => {
  it("sin corrida no muestra resultado ni gráfico", () => {
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(screen.queryByText("Resultado completo")).toBeNull();
    expect(
      screen.queryByText("Evolución de latencia y hits durante el stress"),
    ).toBeNull();
  });

  it("una corrida terminada muestra el resultado y la evolución de latencia", () => {
    useEndpointStressMutation.mockReturnValue(
      mutationState({ data: stressResult() }),
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(screen.getByText("Resultado completo")).toBeInTheDocument();
    expect(
      screen.getByText("Evolución de latencia y hits durante el stress"),
    ).toBeInTheDocument();
  });

  it("una corrida sin timeline no rompe el gráfico", () => {
    // Un dry-run puede volver sin muestras: el gráfico tiene que decirlo, no
    // reventar la card entera.
    useEndpointStressMutation.mockReturnValue(
      mutationState({ data: stressResult({ latencyTimeline: [] }) }),
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(screen.getByText("Sin datos todavía.")).toBeInTheDocument();
  });

  it("si el runner produjo logs Pino, se pueden descargar", () => {
    useEndpointStressMutation.mockReturnValue(
      mutationState({
        data: stressResult({
          pinoLogFileName: "stress-ep-1.log",
          pinoLogLines: ['{"msg":"ok"}'],
        }),
      }),
    );
    render(<StressTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.getByRole("link", { name: "Descargar logs Pino" }),
    ).toHaveAttribute("download", "stress-ep-1.log");
  });
});

describe("StressTestCard · cambio de endpoint", () => {
  it("elegir otro endpoint reinicia la ruta del formulario", async () => {
    const { rerender } = render(
      <StressTestCard endpointId="ep-1" endpoint={HEALTH} />,
    );
    expect(screen.getByRole("textbox", { name: /Ruta\/path/ })).toHaveValue(
      "/api/v1/health",
    );

    rerender(
      <StressTestCard
        endpointId="ep-2"
        endpoint={endpointFixture({
          endpointId: "ep-2",
          fullPath: "/api/v1/otra",
        })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /Ruta\/path/ })).toHaveValue(
        "/api/v1/otra",
      ),
    );
  });
});
