import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Elegir a quién dar acceso: buscando en el SERVIDOR por nombre o correo si se puede ver el
 * personal; si no, por identificador. Antes se pedían 100 personas una vez y se filtraba en el
 * navegador: la 101 no aparecía nunca.
 */
let permitido = true;
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({
    children,
    fallback,
  }: Readonly<{ children: ReactNode; fallback?: ReactNode }>) => (
    <>{permitido ? children : fallback}</>
  ),
}));
vi.mock("@/shared/lib/use-debounced-value", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));
vi.mock("@/features/internal-users/services", () => ({
  listInternalUsers: vi.fn(),
}));
vi.mock("@/features/files/services", () => ({
  listarVisibilidad: vi.fn(),
}));

const { listInternalUsers } = await import("@/features/internal-users/services");
const { SelectorDePersona } =
  await import("@/features/files/share-person-picker");

function pintar(onChange: (valor: string) => void = () => undefined) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <SelectorDePersona value="" onChange={onChange} />
    </QueryClientProvider>,
  );
}

describe("SelectorDePersona", () => {
  beforeEach(() => {
    permitido = true;
    vi.clearAllMocks();
  });

  it("lo que se escribe viaja al servidor como q, sólo con cuentas activas", async () => {
    vi.mocked(listInternalUsers).mockResolvedValue({
      items: [
        { id: "7", fullName: "Ana Quispe", email: "a@x.bo", status: "active" },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    } as never);
    const onChange = vi.fn();
    pintar(onChange);
    const buscador = screen.getByRole("combobox");
    fireEvent.change(buscador, { target: { value: "quispe" } });
    await waitFor(() =>
      expect(listInternalUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "quispe", status: "active", limit: 20 }),
      ),
    );
    fireEvent.mouseDown(await screen.findByRole("option", { name: /Ana Quispe/ }));
    expect(onChange).toHaveBeenCalledWith("7");
  });

  it("si el servidor no deja leer al personal, cae al identificador escrito", async () => {
    vi.mocked(listInternalUsers).mockRejectedValue(new Error("403"));
    pintar();
    expect(
      await screen.findByLabelText(/Identificador de la persona/),
    ).toBeInTheDocument();
  });

  it("sin permiso cae al identificador y no pide la lista", () => {
    permitido = false;
    pintar();
    expect(
      screen.getByLabelText(/Identificador de la persona/),
    ).toBeInTheDocument();
    expect(listInternalUsers).not.toHaveBeenCalled();
  });
});
