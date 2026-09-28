import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Elegir a quién dar acceso: por nombre si se puede ver el personal; si no, por identificador,
 * diciendo de dónde sacarlo.
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
vi.mock("@/features/files/services", () => ({
  listarPersonasInternas: vi.fn(),
  listarVisibilidad: vi.fn(),
}));

const { listarPersonasInternas } = await import("@/features/files/services");
const { SelectorDePersona } =
  await import("@/features/files/share-person-picker");

function pintar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <SelectorDePersona value="" onChange={() => undefined} />
    </QueryClientProvider>,
  );
}

describe("SelectorDePersona", () => {
  beforeEach(() => {
    permitido = true;
    vi.clearAllMocks();
  });

  it("con permiso ofrece a las personas por su nombre", async () => {
    vi.mocked(listarPersonasInternas).mockResolvedValue({
      items: [
        { id: "7", fullName: "Ana Quispe", email: "a@x.bo", status: "active" },
      ],
    });
    pintar();
    expect(await screen.findByText("Elige a una persona")).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Identificador de la persona/),
    ).not.toBeInTheDocument();
  });

  it("sin permiso cae al identificador y no pide la lista", () => {
    permitido = false;
    pintar();
    expect(
      screen.getByLabelText(/Identificador de la persona/),
    ).toBeInTheDocument();
    expect(listarPersonasInternas).not.toHaveBeenCalled();
  });
});
