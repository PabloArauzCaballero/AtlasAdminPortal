import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    session: null,
    user: { email: "ana@atlas.bo", status: "active", tenantId: "1" },
    permissions: [],
    roles: ["admin"],
  }),
}));

const { SessionSecurityPage } =
  await import("@/features/security/session-security-page");

/**
 * Las comprobaciones de producción de la sesión: una tabla con su buscador y su filtro de estado,
 * no una pila de tarjetas. Con la sesión vacía la de segundo factor sale en alerta y la de
 * vencimiento en correcto, y eso permite distinguir los filtros.
 */
describe("SessionSecurityPage · checks de producción", () => {
  it("los checks son una tabla con cabeceras y una fila por comprobación", () => {
    render(<SessionSecurityPage />);
    const tabla = screen.getByRole("table");
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(
      expect.arrayContaining(["Comprobación", "Estado", "Qué significa"]),
    );
    expect(within(tabla).getByText("Segundo factor")).toBeInTheDocument();
    expect(
      within(tabla).getByText("Vencimiento de sesión"),
    ).toBeInTheDocument();
  });

  it("el buscador recorta las filas por nombre o descripción", async () => {
    render(<SessionSecurityPage />);
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por comprobación o descripción…",
      }),
      "segundo factor",
    );
    await waitFor(() =>
      expect(screen.queryByText("Vencimiento de sesión")).toBeNull(),
    );
    expect(screen.getByText("Segundo factor")).toBeInTheDocument();
  });

  it("un texto que nada contiene dice que nada coincide, no que no hay comprobaciones", async () => {
    render(<SessionSecurityPage />);
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Buscar por comprobación o descripción…",
      }),
      "zzzz",
    );
    expect(
      await screen.findByText("Ninguna comprobación coincide con los filtros."),
    ).toBeInTheDocument();
  });
});
