import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const useLabEndpoints = vi.hoisted(() => vi.fn());
vi.mock("@/features/qa-lab/hooks", () => ({ useLabEndpoints }));

const { JourneyStepEndpointSelect } =
  await import("@/features/qa-lab/journey-step-endpoint-select");

function withEndpoints(items: EndpointItem[]) {
  useLabEndpoints.mockReturnValue({
    isLoading: false,
    error: null,
    data: { items, meta: { page: 1, limit: 8, total: items.length } },
  });
}

const HEALTH = endpointFixture({
  endpointId: "ep-1",
  method: "GET",
  fullPath: "/api/v1/health",
});
const LOGIN = endpointFixture({
  endpointId: "ep-2",
  method: "POST",
  fullPath: "/api/v1/auth/login",
});

beforeEach(() => {
  useLabEndpoints.mockReset();
  withEndpoints([HEALTH, LOGIN]);
});

const BUSCAR = "Buscar endpoint…";

describe("JourneyStepEndpointSelect · estado cerrado", () => {
  it("cerrado muestra el endpoint ya elegido, no una caja vacía", () => {
    render(<JourneyStepEndpointSelect endpointId="ep-1" onSelect={vi.fn()} />);

    expect(screen.getByPlaceholderText(BUSCAR)).toHaveValue("#ep-1");
  });

  it("sin endpoint elegido queda vacío para que guíe el placeholder", () => {
    render(<JourneyStepEndpointSelect endpointId="" onSelect={vi.fn()} />);

    expect(screen.getByPlaceholderText(BUSCAR)).toHaveValue("");
  });

  it("cerrado no lista resultados", () => {
    render(<JourneyStepEndpointSelect endpointId="ep-1" onSelect={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /health/ })).toBeNull();
  });
});

describe("JourneyStepEndpointSelect · búsqueda", () => {
  it("al enfocar abre la lista y limpia el id previo para poder teclear", async () => {
    // Si dejara el "#ep-1" dentro, el operador tendría que borrarlo a mano
    // antes de buscar.
    render(<JourneyStepEndpointSelect endpointId="ep-1" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByPlaceholderText(BUSCAR));

    expect(screen.getByPlaceholderText(BUSCAR)).toHaveValue("");
    expect(screen.getByRole("button", { name: /health/ })).toBeInTheDocument();
  });

  it("lo tecleado se consulta al catálogo (el filtro no es local)", async () => {
    render(<JourneyStepEndpointSelect endpointId="" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByPlaceholderText(BUSCAR));
    await userEvent.type(screen.getByPlaceholderText(BUSCAR), "login");

    expect(useLabEndpoints).toHaveBeenLastCalledWith({
      page: 1,
      limit: 8,
      q: "login",
    });
  });

  it("mientras busca lo dice en vez de parecer vacío", async () => {
    useLabEndpoints.mockReturnValue({
      isLoading: true,
      error: null,
      data: undefined,
    });
    render(<JourneyStepEndpointSelect endpointId="" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByPlaceholderText(BUSCAR));

    expect(screen.getByText("Buscando…")).toBeInTheDocument();
  });

  it("sin resultados lo dice: el desplegable vacío parecería roto", async () => {
    withEndpoints([]);
    render(<JourneyStepEndpointSelect endpointId="" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByPlaceholderText(BUSCAR));

    expect(screen.getByText("Sin resultados.")).toBeInTheDocument();
  });

  it("cada resultado muestra su método y su ruta", async () => {
    render(<JourneyStepEndpointSelect endpointId="" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByPlaceholderText(BUSCAR));

    // El método importa tanto como la ruta: `/auth/login` existe como POST y
    // elegir el verbo equivocado rompe el paso sin decir por qué.
    expect(
      screen.getByRole("button", { name: /^POST.*\/api\/v1\/auth\/login$/ }),
    ).toBeInTheDocument();
  });

  it("un endpoint sin fullPath cae en su routePath en vez de quedar en blanco", async () => {
    withEndpoints([
      endpointFixture({
        endpointId: "ep-3",
        fullPath: undefined as unknown as string,
        routePath: "/solo-route-path",
      }),
    ]);
    render(<JourneyStepEndpointSelect endpointId="" onSelect={vi.fn()} />);

    await userEvent.click(screen.getByPlaceholderText(BUSCAR));

    expect(
      screen.getByRole("button", { name: /\/solo-route-path/ }),
    ).toBeInTheDocument();
  });
});

describe("JourneyStepEndpointSelect · selección", () => {
  it("elegir un resultado entrega el endpoint completo, no solo su id", async () => {
    // La card necesita method/fullPath para el preset y la etiqueta.
    const onSelect = vi.fn();
    render(<JourneyStepEndpointSelect endpointId="" onSelect={onSelect} />);
    await userEvent.click(screen.getByPlaceholderText(BUSCAR));

    await userEvent.click(
      screen.getByRole("button", { name: /\/api\/v1\/auth\/login$/ }),
    );

    expect(onSelect).toHaveBeenCalledWith(LOGIN);
  });

  it("el clic se registra pese a que el blur del input cierre la lista", async () => {
    // Regresión: con `onClick` el `onBlur` del input cerraba el desplegable
    // antes de que el clic llegara al botón y la selección se perdía.
    // Por eso el botón escucha `onMouseDown`.
    const onSelect = vi.fn();
    render(<JourneyStepEndpointSelect endpointId="" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(BUSCAR);
    await userEvent.click(input);
    const option = screen.getByRole("button", { name: /health/ });

    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: option },
      { keys: "[/MouseLeft]", target: option },
    ]);

    expect(onSelect).toHaveBeenCalledWith(HEALTH);
  });

  it("el desplegable se cierra al salir del campo", async () => {
    render(<JourneyStepEndpointSelect endpointId="ep-1" onSelect={vi.fn()} />);
    await userEvent.click(screen.getByPlaceholderText(BUSCAR));
    expect(screen.getByRole("button", { name: /health/ })).toBeInTheDocument();

    await userEvent.tab();

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /health/ })).toBeNull(),
    );
  });
});
