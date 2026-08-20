import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuth = vi.hoisted(() => vi.fn());
const useInternalRoles = vi.hoisted(() => vi.fn());
const useUpdateInternalUserRolesMutation = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth/auth-context", () => ({ useAuth }));
vi.mock("@/features/internal-users/hooks", () => ({
  useInternalRoles,
  useUpdateInternalUserRolesMutation,
}));

const { UserRolesForm } =
  await import("@/features/internal-users/user-roles-form");

const mutate = vi.fn();

const ROLES = {
  data: {
    items: [
      {
        id: "1",
        code: "SUPER_ADMIN",
        name: "Superadministrador",
        description: "Todo",
        permissions: ["a", "b"],
      },
      {
        id: "2",
        code: "QA_ENGINEER",
        name: "QA",
        description: "Pruebas",
        permissions: ["c"],
      },
    ],
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

function userFixture(id: string) {
  return {
    id,
    email: `u${id}@atlas.test`,
    fullName: `Usuario ${id}`,
    status: "active",
    roles: ["SUPER_ADMIN"],
    permissions: [],
  };
}

beforeEach(() => {
  mutate.mockReset();
  useInternalRoles.mockReturnValue(ROLES);
  useUpdateInternalUserRolesMutation.mockReturnValue({
    mutate,
    isPending: false,
    error: null,
    isSuccess: false,
  });
});

/**
 * `InternalUsersService.replaceRoles` responde 403 «No puedes reemplazar tus propios roles internos
 * desde este endpoint» cuando el objetivo es el propio actor. La pantalla lo ignoraba: pintaba las
 * casillas activas y el botón habilitado, así que un administrador podía desmarcarse SUPER_ADMIN y
 * recibir un error rojo por algo que nunca iba a poder hacer — con las casillas ya desmarcadas, que
 * es peor, porque parecía que se había quedado sin permisos.
 */
describe("UserRolesForm sobre la propia cuenta", () => {
  it("bloquea las casillas y el botón de guardar", async () => {
    useAuth.mockReturnValue({ user: { id: "7" } });
    render(<UserRolesForm user={userFixture("7")} />);

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
    expect(
      screen.getByRole("button", { name: /guardar roles/i }),
    ).toBeDisabled();
  });

  it("explica por qué, en vez de fallar al guardar", () => {
    useAuth.mockReturnValue({ user: { id: "7" } });
    render(<UserRolesForm user={userFixture("7")} />);

    expect(screen.getByText(/tu propia cuenta/i)).toBeInTheDocument();
    expect(
      screen.getByText(/tiene que hacerlo otro administrador/i),
    ).toBeInTheDocument();
  });

  it("un intento de marcar una casilla no cambia la selección", async () => {
    useAuth.mockReturnValue({ user: { id: "7" } });
    render(<UserRolesForm user={userFixture("7")} />);

    const qa = screen.getAllByRole("checkbox")[1];
    await userEvent.click(qa).catch(() => undefined);
    expect(qa).not.toBeChecked();
    expect(mutate).not.toHaveBeenCalled();
  });

  /** El id llega como número desde algunas respuestas y como cadena desde otras. */
  it("compara el identificador sin depender del tipo", () => {
    useAuth.mockReturnValue({ user: { id: 7 } });
    render(<UserRolesForm user={userFixture("7")} />);
    expect(
      screen.getByRole("button", { name: /guardar roles/i }),
    ).toBeDisabled();
  });
});

describe("UserRolesForm sobre la cuenta de otra persona", () => {
  beforeEach(() => useAuth.mockReturnValue({ user: { id: "1" } }));

  it("permite editar y guardar", async () => {
    render(<UserRolesForm user={userFixture("9")} />);

    expect(screen.queryByText(/tu propia cuenta/i)).not.toBeInTheDocument();
    const qa = screen.getAllByRole("checkbox")[1];
    await userEvent.click(qa);
    expect(qa).toBeChecked();

    await userEvent.click(
      screen.getByRole("button", { name: /guardar roles/i }),
    );
    expect(mutate).toHaveBeenCalledWith(["SUPER_ADMIN", "QA_ENGINEER"]);
  });
});
