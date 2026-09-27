import {
  elegirOpcion,
  valoresDeOpciones,
} from "../../shared/option-select-helpers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  JourneyRunnerConfigFields,
  type JourneyRunnerConfig,
} from "@/features/qa-lab/journey-runner-config-form";

vi.setConfig({ testTimeout: 30000 });

function config(
  overrides: Partial<JourneyRunnerConfig> = {},
): JourneyRunnerConfig {
  return {
    environment: "LOCAL",
    baseRouteKey: "ENVIRONMENT_DEFAULT",
    customHostUrl: "",
    dryRun: true,
    timeoutMs: 20000,
    authMode: "session",
    customAuthToken: "",
    deviceProfile: "none",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    mockScenario: "",
    mockLatencyMs: 0,
    iterations: 1,
    concurrency: 1,
    seed: "qa-base",
    ...overrides,
  };
}

describe("JourneyRunnerConfigFields · ambiente y timeout", () => {
  it("no ofrece elegir ambiente: sale del despliegue del portal", () => {
    render(<JourneyRunnerConfigFields config={config()} onChange={vi.fn()} />);

    expect(
      screen.queryByRole("combobox", { name: "Ambiente" }),
    ).not.toBeInTheDocument();
  });

  it("el timeout por paso llega como número", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ timeoutMs: 2000 })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("spinbutton", { name: "Espera máxima por paso (ms)" }),
      "0",
    );

    expect(onChange).toHaveBeenCalledWith({ timeoutMs: 20000 });
  });

  it("el host manual se propaga", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ baseRouteKey: "CUSTOM_HOST" })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText("https://staging-api.atlas.local"),
      "h",
    );

    expect(onChange).toHaveBeenCalledWith({ customHostUrl: "h" });
  });
});

describe("JourneyRunnerConfigFields · credencial del journey", () => {
  it("el token manual solo se pide con auth mode 'custom'", async () => {
    // Pedirlo siempre invitaría a pegar un token que no se va a usar.
    const onChange = vi.fn();
    const { rerender } = render(
      <JourneyRunnerConfigFields config={config()} onChange={onChange} />,
    );
    expect(
      screen.queryByRole("textbox", { name: /Token de otro actor/ }),
    ).toBeNull();

    await elegirOpcion(
      screen.getByRole("combobox", { name: "Credencial de la petición" }),
      "custom",
    );
    expect(onChange).toHaveBeenCalledWith({ authMode: "custom" });

    rerender(
      <JourneyRunnerConfigFields
        config={config({ authMode: "custom" })}
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: /Token de otro actor/ }),
    ).toBeInTheDocument();
  });

  it("el token manual tecleado se propaga", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ authMode: "custom" })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("textbox", { name: /Token de otro actor/ }),
      "e",
    );

    expect(onChange).toHaveBeenCalledWith({ customAuthToken: "e" });
  });

  it("ofrece correr sin autenticación o con token inválido (matriz de permisos)", async () => {
    render(<JourneyRunnerConfigFields config={config()} onChange={vi.fn()} />);
    const select = screen.getByRole("combobox", {
      name: "Credencial de la petición",
    });

    expect(await valoresDeOpciones(select)).toEqual([
      "session",
      "none",
      "invalid",
      "custom",
    ]);
  });
});

describe("JourneyRunnerConfigFields · guardas", () => {
  // El dry-run ya no vive como checkbox de este formulario: lo deciden los dos botones del panel
  // ("Previsualizar" / "Ejecutar journey real"), justamente porque un checkbox aparte podía quedar
  // marcado sin que el operador lo notara — ver journey-runner-panel.tsx.
  it("no ofrece un checkbox de dry-run: eso lo deciden los botones del panel", () => {
    render(<JourneyRunnerConfigFields config={config()} onChange={vi.fn()} />);

    expect(
      screen.queryByRole("checkbox", { name: /dry-run/i }),
    ).not.toBeInTheDocument();
  });

  it("los headers de tenant e idempotencia se pueden quitar por separado", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Enviar clave anti-duplicados (x-idempotency-key)",
      }),
    );

    expect(onChange).toHaveBeenCalledWith({ includeIdempotencyKey: false });
    expect(onChange).not.toHaveBeenCalledWith({ includeTenantHeader: false });
  });

  it("el perfil de dispositivo se propaga", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);
    const select = screen.getByRole("combobox", {
      name: /Cabeceras de dispositivo/,
    });
    const otro = (await valoresDeOpciones(select)).find(
      (valor) => valor !== "none",
    );

    await elegirOpcion(select, otro!);

    expect(onChange).toHaveBeenCalledWith({ deviceProfile: otro });
  });
});

describe("JourneyRunnerConfigFields · volumen (personas simuladas)", () => {
  it("la cantidad de personas se propaga", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ iterations: 1 })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("spinbutton", { name: "Cantidad de personas" }),
      "0",
    );

    expect(onChange).toHaveBeenCalledWith({ iterations: 10 });
  });

  it("la concurrencia se propaga", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ concurrency: 1 })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("spinbutton", { name: "Personas a la vez" }),
      "5",
    );

    expect(onChange).toHaveBeenCalledWith({ concurrency: 15 });
  });

  it("la semilla del lote se propaga", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);

    await elegirOpcion(
      screen.getByRole("combobox", { name: "Personas de prueba" }),
      "qa-frontera",
    );

    expect(onChange).toHaveBeenCalledWith({ seed: "qa-frontera" });
  });

  it("los controles del mock sólo aparecen cuando la ruta base es el mock de proveedores", () => {
    const { rerender } = render(
      <JourneyRunnerConfigFields config={config()} onChange={vi.fn()} />,
    );

    expect(
      screen.queryByRole("combobox", { name: "Escenario del mock" }),
    ).not.toBeInTheDocument();

    rerender(
      <JourneyRunnerConfigFields
        config={config({ baseRouteKey: "MOCK_PROVIDERS" })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Escenario del mock" }),
    ).toBeInTheDocument();
  });
});
