import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UsuarioCreadoAviso } from "@/features/internal-users/user-create-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const PASSWORD = "Xk9#pQ2vLm7!wR4tZs";

/**
 * El aviso de alta NO puede enseñar la contraseña provisional: viaja por correo. Hasta el
 * 2026-09-17 se pintaba una vez con botón de copiar, y quedaba en pantalla, en el portapapeles y
 * en capturas.
 */
describe("UsuarioCreadoAviso", () => {
  it("no contiene la contraseña, ni botón de copiar, ni el testid que la exponía", () => {
    render(
      <UsuarioCreadoAviso
        email="nueva@atlas.internal"
        userId="u1"
        onContinue={vi.fn()}
      />,
    );

    expect(screen.queryByText(PASSWORD)).toBeNull();
    expect(document.body.textContent).not.toContain(PASSWORD);
    expect(screen.queryByTestId("temporary-password")).toBeNull();
    expect(screen.queryByRole("button", { name: /copiar/i })).toBeNull();
  });

  it("dice a qué correo se envió y qué verá la persona al entrar", () => {
    render(
      <UsuarioCreadoAviso
        email="nueva@atlas.internal"
        userId="u1"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /^usuario creado$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nueva@atlas\.internal/)).toBeInTheDocument();
    expect(screen.getByText(/código de un solo uso/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ficha del usuario/i }),
    ).toHaveAttribute("href", "/internal/settings/users/u1");
  });
});
