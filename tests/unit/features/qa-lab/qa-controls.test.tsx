import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  CheckBox,
  NumberField,
  QaExpectationsControls,
  QaScenarioControls,
  QaTargetControls,
  type CommonLabFormState,
} from "@/features/qa-lab/qa-controls";
import { DEFAULT_QA_BASE_ROUTE } from "@/features/qa-lab/base-routes";
import { endpointFixture } from "./endpoint-fixture";

function commonForm(
  overrides: Partial<CommonLabFormState> = {},
): CommonLabFormState {
  return {
    baseRouteKey: DEFAULT_QA_BASE_ROUTE,
    customHostUrl: "",
    routeOverride: "",
    expectedStatusCodes: "200",
    expectedBodyContains: "",
    maxLatencyMs: 20000,
    maxResponseSizeBytes: 0,
    scenario: "valid_payload",
    authMode: "session",
    customAuthToken: "",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    deviceProfile: "none",
    ...overrides,
  };
}

describe("QaTargetControls · destino de la prueba", () => {
  it("el hint de la ruta anuncia el path catalogado del endpoint elegido", () => {
    // Es la única pista de contra qué se va a pegar si el operador no escribe
    // un override.
    render(
      <QaTargetControls
        form={commonForm()}
        endpoint={endpointFixture({ fullPath: "/api/v1/health" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Default: \/api\/v1\/health/)).toBeInTheDocument();
  });

  it("sin endpoint seleccionado lo dice en vez de mostrar 'Default: undefined'", () => {
    render(<QaTargetControls form={commonForm()} onChange={vi.fn()} />);

    expect(screen.getByText(/Default: sin ruta/)).toBeInTheDocument();
  });

  it("el host manual se propaga al formulario", async () => {
    const onChange = vi.fn();
    render(<QaTargetControls form={commonForm()} onChange={onChange} />);

    await userEvent.type(
      screen.getByPlaceholderText("https://staging-api.atlas.local"),
      "x",
    );

    expect(onChange).toHaveBeenCalledWith({ customHostUrl: "x" });
  });

  it("la ruta manual se propaga al formulario", async () => {
    const onChange = vi.fn();
    render(
      <QaTargetControls
        form={commonForm()}
        endpoint={endpointFixture({ fullPath: "/api/v1/health" })}
        onChange={onChange}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText("/api/v1/health"), "/x");

    expect(onChange).toHaveBeenLastCalledWith({ routeOverride: "x" });
  });
});

describe("QaExpectationsControls · criterios de salida", () => {
  it("la variante funcional ofrece todos los umbrales de aprobación", () => {
    render(<QaExpectationsControls form={commonForm()} onChange={vi.fn()} />);

    expect(screen.getByText("Max latencia ms")).toBeInTheDocument();
    expect(screen.getByText("Max respuesta bytes")).toBeInTheDocument();
    expect(screen.getByText("Respuesta contiene")).toBeInTheDocument();
  });

  it("la variante stress solo pide los HTTP esperados", () => {
    // El stress mide latencia con sus propios percentiles: un "max latencia"
    // por request aquí sería un umbral distinto con el mismo nombre.
    render(
      <QaExpectationsControls
        form={commonForm()}
        variant="stress"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("HTTP esperados")).toBeInTheDocument();
    expect(screen.queryByText("Max latencia ms")).toBeNull();
    expect(screen.queryByText("Respuesta contiene")).toBeNull();
  });

  it("los HTTP esperados se propagan como texto crudo (el parseo es del form)", async () => {
    const onChange = vi.fn();
    render(
      <QaExpectationsControls
        form={commonForm({ expectedStatusCodes: "" })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("textbox", { name: /HTTP esperados/ }),
      "2",
    );

    expect(onChange).toHaveBeenCalledWith({ expectedStatusCodes: "2" });
  });
});

describe("QaScenarioControls · escenario y credencial", () => {
  it("explica qué hace el escenario activo y qué se espera que pase", () => {
    render(<QaScenarioControls form={commonForm()} onChange={vi.fn()} />);

    expect(screen.getByText(/Resultado esperado:/)).toBeInTheDocument();
  });

  it("cambiar de escenario aplica también su preconfiguración, no solo el nombre", async () => {
    // El escenario existe para preconfigurar el form: si solo guardara `scenario`
    // el selector sería decorativo y la prueba seguiría corriendo como antes.
    const onChange = vi.fn();
    render(<QaScenarioControls form={commonForm()} onChange={onChange} />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Escenario de prueba/ }),
      "without_auth",
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ scenario: "without_auth" }),
    );
    expect(Object.keys(onChange.mock.calls[0][0]).length).toBeGreaterThan(1);
  });

  it("un escenario desconocido cae en el válido por defecto en vez de romper", () => {
    // Un form persistido de una versión anterior no debe dejar la pantalla en
    // blanco.
    render(
      <QaScenarioControls
        form={commonForm({ scenario: "escenario_que_ya_no_existe" })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: /Escenario de prueba/ }),
    ).toHaveValue("valid_payload");
  });

  it("el token manual solo se pide cuando el auth mode es 'custom'", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QaScenarioControls form={commonForm()} onChange={onChange} />,
    );
    expect(screen.queryByPlaceholderText("eyJhbGciOi...")).toBeNull();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Auth mode efectivo/ }),
      "custom",
    );
    expect(onChange).toHaveBeenCalledWith({ authMode: "custom" });

    rerender(
      <QaScenarioControls
        form={commonForm({ authMode: "custom" })}
        onChange={onChange}
      />,
    );
    expect(screen.getByPlaceholderText("eyJhbGciOi...")).toBeInTheDocument();
  });

  it("los headers de tenant e idempotencia se pueden quitar (matriz de permisos)", async () => {
    const onChange = vi.fn();
    render(<QaScenarioControls form={commonForm()} onChange={onChange} />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Incluir x-tenant-id" }),
    );

    expect(onChange).toHaveBeenCalledWith({ includeTenantHeader: false });
  });
});

describe("NumberField", () => {
  it("entrega un número, no el texto del input", async () => {
    // Si entregara "42" el body del request llevaría un string donde el backend
    // espera un entero.
    const onChange = vi.fn();
    render(
      <NumberField
        label="Timeout ms"
        value={2}
        min={0}
        max={100}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("spinbutton", { name: "Timeout ms" }),
      "5",
    );

    expect(onChange).toHaveBeenCalledWith(25);
  });

  it("publica min y max para que el navegador valide", () => {
    render(
      <NumberField
        label="RPS"
        value={5}
        min={1}
        max={500}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("spinbutton", { name: "RPS" });

    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "500");
  });
});

describe("CheckBox", () => {
  it("refleja el estado y entrega el nuevo valor al alternar", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CheckBox label="Dry-run" checked={false} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Dry-run" }));
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<CheckBox label="Dry-run" checked onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Dry-run" }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
