import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EndpointItem } from "@/features/systems/types";
import { AtlasApiError } from "@/shared/api/errors";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const useLabEndpoints = vi.hoisted(() => vi.fn());
vi.mock("@/features/qa-lab/hooks", () => ({ useLabEndpoints }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const { EndpointPicker } = await import("@/features/qa-lab/endpoint-picker");

const HEALTH = endpointFixture({
  endpointId: "ep-1",
  method: "GET",
  fullPath: "/api/v1/health",
  module: "platform",
  riskLevel: "LOW",
  status: "ACTIVE",
});

function withEndpoints(items: EndpointItem[]) {
  useLabEndpoints.mockReturnValue({
    isLoading: false,
    error: null,
    data: { items, meta: { page: 1, limit: 10, total: items.length } },
  });
}

beforeEach(() => {
  useLabEndpoints.mockReset();
  withEndpoints([HEALTH]);
});

describe("EndpointPicker · estados de la consulta", () => {
  it("mientras carga muestra el esqueleto y no una tabla vacía", () => {
    useLabEndpoints.mockReturnValue({
      isLoading: true,
      error: null,
      data: undefined,
    });
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);

    expect(screen.getByLabelText("Cargando")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("un fallo del catálogo se ve, con su mensaje y su requestId", () => {
    // Si el error no se pinta, el operador ve una pantalla vacía y cree que no
    // hay endpoints catalogados.
    useLabEndpoints.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new AtlasApiError({
        status: 500,
        code: "CATALOG_DOWN",
        message: "El catálogo no responde.",
        requestId: "req-7",
      }),
    });
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);

    expect(screen.getByText("El catálogo no responde.")).toBeInTheDocument();
    expect(screen.getByText(/req-7/)).toBeInTheDocument();
  });

  it("un fallo sin forma de error del API igual se explica", () => {
    useLabEndpoints.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new TypeError("Failed to fetch"),
    });
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);

    expect(
      screen.getByText("No se pudo cargar el catálogo de endpoints."),
    ).toBeInTheDocument();
  });

  it("sin resultados explica cómo salir del paso", () => {
    withEndpoints([]);
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);

    expect(
      screen.getByText("No se encontraron endpoints."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ajusta la búsqueda o pega el endpointId directamente."),
    ).toBeInTheDocument();
  });
});

describe("EndpointPicker · búsqueda", () => {
  it("lo tecleado se consulta al backend paginado", async () => {
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);

    await userEvent.type(
      screen.getByPlaceholderText("Buscar ruta, módulo o acción..."),
      "health",
    );

    expect(useLabEndpoints).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      q: "health",
    });
  });
});

describe("EndpointPicker · elegir endpoint", () => {
  it("cada fila ofrece probar su endpoint y entrega su id", async () => {
    const onSelect = vi.fn();
    render(<EndpointPicker selectedId="" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: "Probar" }));

    expect(onSelect).toHaveBeenCalledWith("ep-1");
  });

  it("la fila enlaza a la ficha del endpoint y muestra su método", () => {
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);
    const row = screen.getByRole("row", { name: /\/api\/v1\/health/ });

    expect(
      within(row).getByRole("link", { name: "/api/v1/health" }),
    ).toHaveAttribute("href", "/internal/systems/endpoints/ep-1");
    expect(within(row).getByText("GET")).toBeInTheDocument();
  });

  it("pegar un endpointId a mano lo carga sin pasar por la tabla", async () => {
    // Es la vía de escape cuando el endpoint no aparece en la búsqueda.
    const onSelect = vi.fn();
    render(<EndpointPicker selectedId="" onSelect={onSelect} />);

    await userEvent.type(screen.getByPlaceholderText("endpointId"), "ep-99");
    await userEvent.click(
      screen.getByRole("button", { name: "Cargar endpoint" }),
    );

    expect(onSelect).toHaveBeenCalledWith("ep-99");
  });

  it("un id manual vacío o en blanco no dispara una carga", async () => {
    // Cargar "" dejaría la pantalla en un estado sin endpoint pero con las
    // cards montadas.
    const onSelect = vi.fn();
    render(<EndpointPicker selectedId="" onSelect={onSelect} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Cargar endpoint" }),
    );
    await userEvent.type(screen.getByPlaceholderText("endpointId"), "   ");
    await userEvent.click(
      screen.getByRole("button", { name: "Cargar endpoint" }),
    );

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("el id manual se limpia de espacios al pegarlo", async () => {
    const onSelect = vi.fn();
    render(<EndpointPicker selectedId="" onSelect={onSelect} />);

    await userEvent.type(screen.getByPlaceholderText("endpointId"), "  ep-5  ");
    await userEvent.click(
      screen.getByRole("button", { name: "Cargar endpoint" }),
    );

    expect(onSelect).toHaveBeenCalledWith("ep-5");
  });
});

describe("EndpointPicker · endpoint activo", () => {
  it("sin endpoint elegido no anuncia ninguno", () => {
    render(<EndpointPicker selectedId="" onSelect={vi.fn()} />);

    expect(screen.queryByText(/Endpoint seleccionado:/)).toBeNull();
  });

  it("con endpoint elegido lo deja a la vista: es contra quién se va a ejecutar", () => {
    render(<EndpointPicker selectedId="ep-42" onSelect={vi.fn()} />);

    expect(screen.getByText(/Endpoint seleccionado:/)).toBeInTheDocument();
    expect(screen.getByText("#ep-42")).toBeInTheDocument();
  });
});
