import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EndpointSafetyHints,
  MutationError,
  RunControls,
  requiresDoubleConfirmation,
  type EndpointRunFormState,
} from "@/features/qa-lab/endpoint-run-controls";
import { AtlasApiError } from "@/shared/api/errors";
import { DEFAULT_QA_BASE_ROUTE } from "@/features/qa-lab/base-routes";
import { endpointFixture } from "./endpoint-fixture";

// El primer render de este árbol paga la compilación de todo `qa-controls` +
// `qa-device-field`, y en frío se pasa de los 5 s por defecto.
vi.setConfig({ testTimeout: 30000 });

function runForm(
  overrides: Partial<EndpointRunFormState> = {},
): EndpointRunFormState {
  return {
    environment: "LOCAL",
    baseRouteKey: DEFAULT_QA_BASE_ROUTE,
    customHostUrl: "",
    routeOverride: "",
    dryRun: true,
    timeoutMs: 20000,
    allowMutations: false,
    payload: "{}",
    queryParams: "{}",
    pathParams: "{}",
    headers: "{}",
    expectedStatusCodes: "200",
    expectedHeaders: "{}",
    expectedJsonSubset: "",
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

const MUTATION_GUARD = "Permitir mutacion real";

describe("requiresDoubleConfirmation · cuándo hay que teclear EJECUTAR", () => {
  it("exige doble confirmación solo si se muta de verdad fuera de LOCAL", () => {
    expect(
      requiresDoubleConfirmation(
        runForm({
          dryRun: false,
          allowMutations: true,
          environment: "STAGING",
        }),
      ),
    ).toBe(true);
  });

  it("un dry-run nunca la exige, por muy fuera de LOCAL que esté", () => {
    // Un dry-run no manda el request: pedir la frase sería fricción sin motivo.
    expect(
      requiresDoubleConfirmation(
        runForm({
          dryRun: false,
          allowMutations: true,
          environment: "PRODUCTION_READONLY",
        }),
      ),
    ).toBe(true);
    expect(
      requiresDoubleConfirmation(
        runForm({
          dryRun: true,
          allowMutations: true,
          environment: "PRODUCTION_READONLY",
        }),
      ),
    ).toBe(false);
  });

  it("una ejecución real sin mutaciones no la exige", () => {
    expect(
      requiresDoubleConfirmation(
        runForm({
          dryRun: false,
          allowMutations: false,
          environment: "STAGING",
        }),
      ),
    ).toBe(false);
  });

  it("en LOCAL no la exige aunque se mute de verdad", () => {
    expect(
      requiresDoubleConfirmation(
        runForm({ dryRun: false, allowMutations: true, environment: "LOCAL" }),
      ),
    ).toBe(false);
  });
});

describe("RunControls · guarda de mutación", () => {
  it("un GET de solo lectura no ofrece el permiso de mutar", () => {
    // Ofrecerlo invitaría a marcar una casilla que no significa nada.
    render(
      <RunControls
        form={runForm()}
        endpoint={endpointFixture({ method: "GET" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("checkbox", { name: MUTATION_GUARD })).toBeNull();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "un %s exige marcar explícitamente que se permite mutar",
    (method) => {
      render(
        <RunControls
          form={runForm()}
          endpoint={endpointFixture({ method })}
          onChange={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("checkbox", { name: MUTATION_GUARD }),
      ).not.toBeChecked();
    },
  );

  it("un GET marcado como destructivo también pide la guarda", () => {
    // El método no basta: el catálogo puede marcar destructivo un GET que
    // dispara un job.
    render(
      <RunControls
        form={runForm()}
        endpoint={endpointFixture({ method: "GET", isDestructive: true })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: MUTATION_GUARD }),
    ).toBeInTheDocument();
  });

  it("sin endpoint asume GET y no ofrece la guarda", () => {
    render(<RunControls form={runForm()} onChange={vi.fn()} />);

    expect(screen.queryByRole("checkbox", { name: MUTATION_GUARD })).toBeNull();
  });

  it("el dry-run está siempre disponible y se puede desactivar", async () => {
    const onChange = vi.fn();
    render(<RunControls form={runForm()} onChange={onChange} />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Dry-run / modo seguro" }),
    );

    expect(onChange).toHaveBeenCalledWith({ dryRun: false });
  });
});

describe("RunControls · destino", () => {
  it("el método lo fija el endpoint: el operador no lo puede cambiar", () => {
    render(
      <RunControls
        form={runForm()}
        endpoint={endpointFixture({ method: "DELETE" })}
        onChange={vi.fn()}
      />,
    );
    const field = screen.getByRole("textbox", { name: /Metodo/ });

    expect(field).toHaveValue("DELETE");
    expect(field).toHaveAttribute("readonly");
  });

  it("el ambiente se puede mover a producción (el bloqueo vive en la card)", async () => {
    const onChange = vi.fn();
    render(<RunControls form={runForm()} onChange={onChange} />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Ambiente/ }),
      "PRODUCTION_READONLY",
    );

    expect(onChange).toHaveBeenCalledWith({
      environment: "PRODUCTION_READONLY",
    });
  });
});

describe("EndpointSafetyHints · avisos del catálogo", () => {
  it("sin endpoint no inventa avisos", () => {
    const { container } = render(<EndpointSafetyHints />);

    expect(container).toBeEmptyDOMElement();
  });

  it("resume los status esperados del catálogo", () => {
    render(
      <EndpointSafetyHints
        endpoint={endpointFixture({ expectedStatusCodes: [200, 201] })}
      />,
    );

    expect(screen.getByText("esperado: 200, 201")).toBeInTheDocument();
  });

  it("distingue un endpoint de lectura de uno que cambia estado", () => {
    const { unmount } = render(
      <EndpointSafetyHints endpoint={endpointFixture({ isReadonly: true })} />,
    );
    expect(screen.getByText("readonly")).toBeInTheDocument();
    unmount();

    render(
      <EndpointSafetyHints endpoint={endpointFixture({ isReadonly: false })} />,
    );
    expect(screen.getByText("cambia estado")).toBeInTheDocument();
  });

  it("dice si requiere sesión o no", () => {
    const { unmount } = render(
      <EndpointSafetyHints
        endpoint={endpointFixture({ requiresAuth: true })}
      />,
    );
    expect(screen.getByText("requiere sesion")).toBeInTheDocument();
    unmount();

    render(
      <EndpointSafetyHints
        endpoint={endpointFixture({ requiresAuth: false })}
      />,
    );
    expect(screen.getByText("sin auth")).toBeInTheDocument();
  });

  it("un endpoint destructivo se avisa; uno normal no lleva el cartel", () => {
    const { unmount } = render(
      <EndpointSafetyHints
        endpoint={endpointFixture({ isDestructive: true })}
      />,
    );
    expect(screen.getByText("destructivo")).toBeInTheDocument();
    unmount();

    render(<EndpointSafetyHints endpoint={endpointFixture()} />);
    expect(screen.queryByText("destructivo")).toBeNull();
  });

  it("un endpoint solo apto para testing se marca", () => {
    render(
      <EndpointSafetyHints
        endpoint={endpointFixture({ testEnvironmentOnly: true })}
      />,
    );

    expect(screen.getByText("solo testing")).toBeInTheDocument();
  });
});

describe("MutationError · fallo de la ejecución", () => {
  it("un error del API muestra su mensaje y el requestId para rastrearlo", () => {
    render(
      <MutationError
        error={
          new AtlasApiError({
            message: "Host no permitido para QA.",
            status: 403,
            code: "QA_HOST_NOT_ALLOWED",
            requestId: "req-42",
          })
        }
      />,
    );

    expect(screen.getByText("Host no permitido para QA.")).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
  });

  it("un error cualquiera no deja al operador sin explicación", () => {
    // El fallo tiene que ser visible sí o sí; un `TypeError` de red no trae
    // mensaje de negocio.
    render(<MutationError error={new TypeError("Failed to fetch")} />);

    expect(
      screen.getByText("No se pudo ejecutar el endpoint."),
    ).toBeInTheDocument();
  });
});
