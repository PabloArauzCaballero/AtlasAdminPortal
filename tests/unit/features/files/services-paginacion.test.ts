import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La paginación de las listas del expediente.
 *
 * El backend manda `{ items, page, pageSize, total, totalPages, hasNextPage }` con la paginación
 * PLANA, y el cliente del portal sólo arma `meta` si viene `pagination`. Sin traducirla aquí la
 * tabla no pintaba paginador y todo expediente más allá del 25 era inalcanzable.
 */
vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const { apiRequest } = await import("@/shared/api/client");
const { aPaginaDelPortal, listarExpedientes, listarActividad } =
  await import("@/features/files/services");

describe("paginación de expedientes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("convierte la paginación plana del backend en el `meta` que entiende la tabla", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [{ expedienteId: "1" }],
      page: 2,
      pageSize: 25,
      total: 60,
      totalPages: 3,
      hasNextPage: true,
    });
    const lista = await listarExpedientes({ page: 2, pageSize: 25 });
    expect(lista.items).toHaveLength(1);
    expect(lista.meta).toEqual({
      page: 2,
      limit: 25,
      total: 60,
      totalPages: 3,
    });
  });

  it("la actividad sale con la misma forma", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
    });
    const lista = await listarActividad("42", { page: 1, pageSize: 50 });
    expect(vi.mocked(apiRequest).mock.calls[0]?.[0]).toBe(
      "/expedientes/42/actividad",
    );
    expect(lista.meta).toEqual({ page: 1, limit: 50, total: 0, totalPages: 1 });
  });

  it("sin datos de paginación los deduce de la consulta, no de la página recibida", () => {
    const lista = aPaginaDelPortal<{ id: number }>(
      { items: [{ id: 1 }, { id: 2 }] },
      { page: 1, pageSize: 25 },
    );
    expect(lista.meta).toEqual({ page: 1, limit: 25, total: 2, totalPages: 1 });
  });

  it("una respuesta sin items no revienta la tabla", () => {
    expect(aPaginaDelPortal(null, { page: 1, pageSize: 25 }).items).toEqual([]);
  });
});
