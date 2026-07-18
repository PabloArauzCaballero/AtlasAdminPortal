import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_STRESS_FORM,
  StressControls,
  StressSafetyHints,
  type StressFormState,
} from "@/features/qa-lab/stress-controls";
import { HARD_MAX_STRESS_REQUESTS } from "@/features/qa-lab/stress-plan";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

function stressForm(overrides: Partial<StressFormState> = {}): StressFormState {
  return { ...DEFAULT_STRESS_FORM, ...overrides };
}

const MUTATION_GUARD = "Permitir mutacion en stress";

describe("DEFAULT_STRESS_FORM · valores por defecto seguros", () => {
  it("arranca en dry-run y en LOCAL", () => {
    // Un stress real que arrancara armado sería un cañón apuntando al pie.
    expect(DEFAULT_STRESS_FORM.dryRun).toBe(true);
    expect(DEFAULT_STRESS_FORM.environment).toBe("LOCAL");
    expect(DEFAULT_STRESS_FORM.allowMutations).toBe(false);
  });

  it("el tope por defecto no recorta la corrida por defecto", () => {
    // El bug documentado: maxRequests 100 con RPS 5 × 30 s = 150 planeadas
    // recortaba en silencio incluso sin que el operador tocara nada.
    const planeadas =
      DEFAULT_STRESS_FORM.targetRps * DEFAULT_STRESS_FORM.durationSeconds;

    expect(DEFAULT_STRESS_FORM.maxRequests).toBeGreaterThanOrEqual(planeadas);
  });
});

describe("StressControls · plan de carga", () => {
  it("el hint de max requests dice cuántas requests se planean ahora mismo", () => {
    // Es lo que deja ver de un vistazo que el tope va a recortar la corrida.
    render(
      <StressControls
        form={stressForm({ targetRps: 10, durationSeconds: 60 })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/600 planeadas/)).toBeInTheDocument();
  });

  /**
   * Doce campos numéricos construidos por copia y pega: un `onChange` que
   * escriba en la clave del campo de al lado no se ve en pantalla, pero manda
   * el RPS donde va la concurrencia. Se recorren todos por eso.
   */
  it.each([
    ["RPS objetivo", "targetRps", 5],
    ["Concurrencia", "concurrency", 5],
    ["Duracion segundos", "durationSeconds", 30],
    ["Ramp-up segundos", "rampUpSeconds", 5],
    ["Max requests", "maxRequests", 1000],
    ["Timeout ms", "timeoutMs", 20000],
    ["Max error %", "maxErrorRatePercent", 5],
    ["Min throughput RPS", "minThroughputRps", 0],
    ["Max avg ms", "maxAvgMs", 0],
    ["Max p95 ms", "maxP95Ms", 2000],
    ["Max p99 ms", "maxP99Ms", 0],
  ])(
    "'%s' escribe en la clave %s y en ninguna otra",
    async (label, key, current) => {
      const onChange = vi.fn();
      render(<StressControls form={stressForm()} onChange={onChange} />);

      await userEvent.type(
        screen.getByRole("spinbutton", { name: new RegExp(label) }),
        "7",
      );

      expect(onChange).toHaveBeenLastCalledWith({
        [key]: Number(`${current}7`),
      });
    },
  );

  it("max requests no permite pasarse del techo duro del runner", () => {
    render(<StressControls form={stressForm()} onChange={vi.fn()} />);

    expect(
      screen.getByRole("spinbutton", { name: /Max requests/ }),
    ).toHaveAttribute("max", String(HARD_MAX_STRESS_REQUESTS));
  });

  it("el ticket de aprobación se puede registrar (obligatorio fuera de LOCAL)", async () => {
    const onChange = vi.fn();
    render(<StressControls form={stressForm()} onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText("CHG-123"), "C");

    expect(onChange).toHaveBeenCalledWith({ approvalTicket: "C" });
  });

  it("ofrece producción en el selector aunque la card la bloquee después", async () => {
    // El bloqueo se explica al elegirla; esconder la opción dejaría al operador
    // sin saber por qué no puede.
    const onChange = vi.fn();
    render(<StressControls form={stressForm()} onChange={onChange} />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Ambiente/ }),
      "PRODUCTION_READONLY",
    );

    expect(onChange).toHaveBeenCalledWith({
      environment: "PRODUCTION_READONLY",
    });
  });
});

describe("StressControls · guarda de mutación", () => {
  it("un GET de lectura no ofrece permitir mutaciones", () => {
    render(
      <StressControls
        form={stressForm()}
        endpoint={endpointFixture({ method: "GET" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("checkbox", { name: MUTATION_GUARD })).toBeNull();
  });

  it("un POST exige marcarla explícitamente antes de martillearlo", () => {
    // Un stress sobre un POST sin esta guarda crearía cientos de registros.
    render(
      <StressControls
        form={stressForm()}
        endpoint={endpointFixture({ method: "POST" })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: MUTATION_GUARD }),
    ).not.toBeChecked();
  });

  it("un GET destructivo también la exige", () => {
    render(
      <StressControls
        form={stressForm()}
        endpoint={endpointFixture({ method: "GET", isDestructive: true })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: MUTATION_GUARD }),
    ).toBeInTheDocument();
  });

  it("sin endpoint no se ofrece la guarda", () => {
    render(<StressControls form={stressForm()} onChange={vi.fn()} />);

    expect(screen.queryByRole("checkbox", { name: MUTATION_GUARD })).toBeNull();
  });

  it("el stress no ofrece elegir escenario ni credencial (a diferencia del funcional)", () => {
    // `QaScenarioControls` no se monta aquí: martillear un endpoint con un
    // token inválido solo mide el 401.
    render(<StressControls form={stressForm()} onChange={vi.fn()} />);

    expect(screen.queryByText("Escenario de prueba")).toBeNull();
    expect(screen.queryByText("Auth mode efectivo")).toBeNull();
  });
});

describe("StressSafetyHints · avisos previos", () => {
  it("sin endpoint no pinta avisos", () => {
    const { container } = render(<StressSafetyHints />);

    expect(container).toBeEmptyDOMElement();
  });

  it("anuncia el techo duro de requests del runner", () => {
    render(<StressSafetyHints endpoint={endpointFixture()} />);

    expect(screen.getByText(/limite duro:/)).toBeInTheDocument();
  });

  it("distingue un endpoint que exige stress de uno donde es opcional", () => {
    const { unmount } = render(
      <StressSafetyHints
        endpoint={endpointFixture({ requiresStressTest: true })}
      />,
    );
    expect(screen.getByText("stress requerido")).toBeInTheDocument();
    unmount();

    render(
      <StressSafetyHints
        endpoint={endpointFixture({ requiresStressTest: false })}
      />,
    );
    expect(screen.getByText("stress opcional")).toBeInTheDocument();
  });

  it("marca destructivo y PII solo cuando el catálogo lo dice", () => {
    const { unmount } = render(
      <StressSafetyHints
        endpoint={endpointFixture({ isDestructive: true, containsPii: true })}
      />,
    );
    expect(screen.getByText("destructivo")).toBeInTheDocument();
    expect(screen.getByText("contiene PII")).toBeInTheDocument();
    unmount();

    render(<StressSafetyHints endpoint={endpointFixture()} />);
    expect(screen.queryByText("destructivo")).toBeNull();
    expect(screen.queryByText("contiene PII")).toBeNull();
  });
});
