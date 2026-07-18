import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import type { DirectRunResult } from "@/features/qa-lab/types";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const hasPermission = vi.hoisted(() => vi.fn());
const useEndpointRunMutation = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ hasPermission }),
}));
vi.mock("@/features/qa-lab/hooks", () => ({ useEndpointRunMutation }));

const { EndpointTestCard } =
  await import("@/features/qa-lab/endpoint-test-card");

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
  hasPermission.mockReturnValue(true);
  useEndpointRunMutation.mockReturnValue(mutationState());
});

const HEALTH = endpointFixture({
  endpointId: "ep-1",
  fullPath: "/api/v1/health",
});

function runButton() {
  return screen.getByRole("button", { name: /request/ });
}

function runResult(overrides: Partial<DirectRunResult> = {}): DirectRunResult {
  return {
    url: "http://localhost:3005/api/v1/health",
    method: "GET",
    dryRun: true,
    httpStatus: 200,
    ok: true,
    latencyMs: 12,
    responseBody: { status: "ok" },
    ...overrides,
  };
}

describe("EndpointTestCard · permiso para ejecutar", () => {
  it("sin el permiso de ejecutar, el botón no dispara nada", () => {
    // El gate real vive en el backend, pero ofrecer el botón a quien no puede
    // solo produce 403 confusos.
    hasPermission.mockImplementation(
      (permission: string) => permission !== "systems.endpoints.execute",
    );
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(runButton()).toBeDisabled();
  });

  it("con el permiso y un endpoint elegido, se puede ejecutar", () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(runButton()).toBeEnabled();
    expect(hasPermission).toHaveBeenCalledWith("systems.endpoints.execute");
  });

  it("sin endpoint elegido no se puede ejecutar contra nada", () => {
    render(<EndpointTestCard endpointId="" />);

    expect(runButton()).toBeDisabled();
  });

  it("mientras la corrida está en vuelo no se puede relanzar", () => {
    // Sin esto un doble clic dispara dos veces el request real.
    useEndpointRunMutation.mockReturnValue(mutationState({ isPending: true }));
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(runButton()).toBeDisabled();
  });
});

describe("EndpointTestCard · el botón dice lo que va a pasar", () => {
  it("en dry-run promete previsualizar", () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.getByRole("button", { name: "Previsualizar request" }),
    ).toBeInTheDocument();
  });

  it("al apagar el dry-run avisa de que la ejecución es real", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Dry-run / modo seguro" }),
    );

    expect(
      screen.getByRole("button", { name: "Ejecutar request real" }),
    ).toBeInTheDocument();
  });
});

describe("EndpointTestCard · confirmación", () => {
  it("ejecutar pide confirmación antes de tocar el endpoint", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    await userEvent.click(runButton());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Confirmar dry-run")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("la confirmación dice contra qué endpoint y en qué ambiente", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    await userEvent.click(runButton());

    expect(
      screen.getByText("Se previsualizara el endpoint #ep-1 en LOCAL."),
    ).toBeInTheDocument();
  });

  it("cancelar no ejecuta nada", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirmar ejecuta con lo configurado en el formulario", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({
      dryRun: true,
      environment: "LOCAL",
      allowMutations: false,
    });
  });

  it("una mutación real fuera de LOCAL exige teclear EJECUTAR", async () => {
    // Doble confirmación: es el último freno antes de escribir en un entorno
    // que no es la máquina del operador.
    render(
      <EndpointTestCard
        endpointId="ep-1"
        endpoint={endpointFixture({ method: "POST", endpointId: "ep-1" })}
      />,
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Dry-run / modo seguro" }),
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Permitir mutacion real" }),
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Ambiente/ }),
      "STAGING",
    );

    await userEvent.click(runButton());

    const confirm = screen.getByRole("button", { name: "Ejecutar" });
    expect(confirm).toBeDisabled();
    await userEvent.type(
      screen.getByRole("textbox", { name: /EJECUTAR/ }),
      "EJECUTAR",
    );
    expect(confirm).toBeEnabled();
  });

  it("un dry-run no exige teclear la frase", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    await userEvent.click(runButton());

    expect(screen.getByRole("button", { name: "Previsualizar" })).toBeEnabled();
  });
});

describe("EndpointTestCard · errores visibles (RESUELTO_ATLAS_F1_R7)", () => {
  it("un formulario inválido se rechaza ANTES de abrir el diálogo, y se lee", async () => {
    // El error se pinta en la card, detrás del backdrop `z-50` del diálogo: si
    // el diálogo siguiera abierto, el operador pulsaría "Ejecutar" y no vería
    // absolutamente nada.
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);
    const payload = screen.getByRole("textbox", { name: /Payload de entrada/ });
    await userEvent.clear(payload);
    await userEvent.type(payload, "no soy json");

    await userEvent.click(runButton());

    expect(screen.getByText("Formulario invalido")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("corregido el formulario, el error desaparece y se puede ejecutar", async () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);
    const payload = screen.getByRole("textbox", { name: /Payload de entrada/ });
    await userEvent.clear(payload);
    await userEvent.type(payload, "roto");
    await userEvent.click(runButton());
    expect(screen.getByText("Formulario invalido")).toBeInTheDocument();

    await userEvent.clear(payload);
    await userEvent.click(runButton());

    expect(screen.queryByText("Formulario invalido")).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("un fallo de la ejecución se lee: el diálogo se aparta en vez de taparlo", async () => {
    // El `ErrorState` de la mutación se pinta en la card. Si el diálogo de
    // confirmación siguiera abierto tras el fallo, su backdrop `z-50` lo
    // ocultaría por completo: el operador vería el diálogo intacto y creería
    // que su clic se perdió.
    const fallo = new AtlasApiError({
      status: 403,
      code: "QA_HOST_NOT_ALLOWED",
      message: "Host no permitido para QA.",
      requestId: "req-9",
    });
    mutate.mockImplementation(
      (_input: unknown, options: { onError?: (error: unknown) => void }) => {
        useEndpointRunMutation.mockReturnValue(mutationState({ error: fallo }));
        options?.onError?.(fallo);
      },
    );
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(screen.getByText("Host no permitido para QA.")).toBeInTheDocument();
    expect(screen.getByText(/req-9/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("una corrida exitosa también cierra el diálogo", async () => {
    mutate.mockImplementation(
      (_input: unknown, options: { onSuccess?: () => void }) =>
        options?.onSuccess?.(),
    );
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);
    await userEvent.click(runButton());

    await userEvent.click(
      screen.getByRole("button", { name: "Previsualizar" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("EndpointTestCard · resultado", () => {
  it("sin corrida todavía no muestra resultado", () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(screen.queryByText("Resultado completo")).toBeNull();
  });

  it("una corrida terminada muestra el resultado completo", () => {
    useEndpointRunMutation.mockReturnValue(
      mutationState({ data: runResult() }),
    );
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(screen.getByText("Resultado completo")).toBeInTheDocument();
  });

  it("si el runner produjo logs Pino, se pueden descargar", () => {
    useEndpointRunMutation.mockReturnValue(
      mutationState({
        data: runResult({
          pinoLogFileName: "qa-ep-1.log",
          pinoLogLines: ['{"msg":"ok"}'],
        }),
      }),
    );
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.getByRole("link", { name: "Descargar logs Pino" }),
    ).toHaveAttribute("download", "qa-ep-1.log");
  });

  it("sin logs no ofrece descargarlos", () => {
    useEndpointRunMutation.mockReturnValue(
      mutationState({ data: runResult() }),
    );
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.queryByRole("link", { name: "Descargar logs Pino" }),
    ).toBeNull();
  });
});

describe("EndpointTestCard · payload de ejemplo", () => {
  it("un endpoint con preset ofrece rellenar un payload ejecutable", async () => {
    // El `minPayloadSchema` catalogado suele ser un puntero al schema Zod, no
    // un payload que se pueda mandar.
    render(
      <EndpointTestCard
        endpointId="ep-2"
        endpoint={endpointFixture({
          endpointId: "ep-2",
          method: "POST",
          fullPath: "/auth/login",
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Usar payload de ejemplo/ }),
    );

    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: /Payload de entrada/,
          }) as HTMLTextAreaElement
        ).value,
      ).toContain('"actorType": "customer"'),
    );
  });

  it("un endpoint sin preset no ofrece el botón", () => {
    render(<EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />);

    expect(
      screen.queryByRole("button", { name: /Usar payload de ejemplo/ }),
    ).toBeNull();
  });
});

describe("EndpointTestCard · cambio de endpoint", () => {
  it("elegir otro endpoint reinicia el formulario y no arrastra la ruta anterior", async () => {
    // Sin el reset se ejecutaría el endpoint nuevo contra la ruta del viejo.
    const { rerender } = render(
      <EndpointTestCard endpointId="ep-1" endpoint={HEALTH} />,
    );
    expect(screen.getByRole("textbox", { name: /Ruta\/path/ })).toHaveValue(
      "/api/v1/health",
    );

    rerender(
      <EndpointTestCard
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
