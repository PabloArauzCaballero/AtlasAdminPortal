import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  UserCreateForm,
  UsuarioCreadoAviso,
} from "@/features/internal-users/user-create-form";
import { renderWithProviders } from "../../../helpers/render-with-providers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/shared/api/client", () => ({
  apiRequest: vi.fn().mockResolvedValue({ items: [] }),
}));

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

  it("dice que se PIDIÓ el envío y que no puede confirmar que llegó: nunca afirma la entrega", () => {
    render(
      <UsuarioCreadoAviso
        email="nueva@atlas.internal"
        userId="u1"
        onContinue={vi.fn()}
      />,
    );

    expect(document.body.textContent).toMatch(/se pidió el envío/i);
    expect(document.body.textContent).toMatch(
      /no puede confirmar que el correo llegó/i,
    );
    expect(document.body.textContent).not.toMatch(
      /se envió|fue enviad|enviamos/i,
    );
  });

  it("el formulario de alta tampoco promete la entrega antes de crear", () => {
    renderWithProviders(<UserCreateForm />);

    expect(document.body.textContent).toMatch(/pide su envío al correo/i);
    expect(document.body.textContent).toMatch(
      /no puede confirmar que el correo llegue/i,
    );
    expect(document.body.textContent).not.toMatch(
      /se enviará|le llegará por correo/i,
    );
  });
});
