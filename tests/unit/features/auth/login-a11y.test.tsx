import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Mail } from "lucide-react";
import { LoginField } from "@/features/auth/login-field";
import { LoginPage } from "@/features/auth/login-page";
import { findA11yViolations } from "../../../helpers/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe("Login rediseñado · accesibilidad y comportamiento", () => {
  it("LoginField asocia label, error y aria-invalid", async () => {
    render(
      <LoginField
        id="f-email"
        label="Correo"
        icon={Mail}
        error="Correo inválido"
      />,
    );
    const input = screen.getByLabelText("Correo");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "f-email-error");
    expect(screen.getByText("Correo inválido")).toBeInTheDocument();
    expect(await findA11yViolations(document.body)).toEqual([]);
  });

  it("la página de login no tiene violaciones de accesibilidad", async () => {
    const { container } = render(<LoginPage />);
    expect(await findA11yViolations(container)).toEqual([]);
  });

  it("mantiene el contrato que esperan los smoke tests", () => {
    render(<LoginPage />);
    // input[type=password] visible por defecto y botón por su nombre.
    expect(document.querySelector('input[type="password"]')).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /entrar al portal interno/i }),
    ).toBeInTheDocument();
  });

  it("el toggle muestra y oculta la contraseña", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const password = screen.getByLabelText("Contraseña");
    expect(password).toHaveAttribute("type", "password");
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(password).toHaveAttribute("type", "text");
    await user.click(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    );
    expect(password).toHaveAttribute("type", "password");
  });
});
