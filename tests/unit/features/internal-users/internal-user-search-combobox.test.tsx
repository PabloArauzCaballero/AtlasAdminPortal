import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InternalUserSearchCombobox } from "@/features/internal-users/internal-user-search-combobox";

vi.mock("@/shared/lib/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));
vi.mock("@/features/internal-users/services", () => ({
  listInternalUsers: vi.fn(),
}));

const { listInternalUsers } =
  await import("@/features/internal-users/services");

const persona = (id: string, nombre: string) => ({
  id,
  email: `${nombre.toLowerCase().replace(" ", ".")}@atlas.test`,
  fullName: nombre,
  status: "active",
  roles: [],
  permissions: [],
});

function pintar(excluir?: ReadonlySet<string>) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <InternalUserSearchCombobox
        value=""
        onChange={vi.fn()}
        label="Persona"
        tooltip="Busca por nombre o correo."
        excluir={excluir}
        fallback={<p>campo manual</p>}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Selector de persona interna (busca en el servidor)", () => {
  it("no ofrece a quien ya está excluido (ya atiende en la mesa)", async () => {
    vi.mocked(listInternalUsers).mockResolvedValue({
      items: [persona("1", "Ana Quispe"), persona("2", "Beto Rojas")],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    } as never);
    pintar(new Set(["1"]));
    fireEvent.focus(screen.getByRole("combobox"));
    expect(await screen.findByText("Beto Rojas")).toBeInTheDocument();
    expect(screen.queryByText("Ana Quispe")).toBeNull();
  });

  it("si hay más coincidencias de las que se enseñan, lo dice en vez de cortar en silencio", async () => {
    vi.mocked(listInternalUsers).mockResolvedValue({
      items: [persona("1", "Ana Quispe")],
      meta: { page: 1, limit: 20, total: 87, totalPages: 5 },
    } as never);
    pintar();
    fireEvent.focus(screen.getByRole("combobox"));
    expect(await screen.findByText(/Hay 87 coincidencias/)).toBeInTheDocument();
  });

  it("sin coincidencias dice que nadie activo coincide, y lo escrito viaja como q", async () => {
    vi.mocked(listInternalUsers).mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    } as never);
    pintar();
    const combo = screen.getByRole("combobox");
    fireEvent.focus(combo);
    fireEvent.change(combo, { target: { value: "zzz" } });
    expect(
      await screen.findByText(/Nadie activo coincide/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(listInternalUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "zzz", status: "active" }),
      ),
    );
  });

  it("si la lista no se puede leer cae al campo manual", async () => {
    vi.mocked(listInternalUsers).mockRejectedValue(new Error("403"));
    pintar();
    expect(await screen.findByText("campo manual")).toBeInTheDocument();
  });
});
