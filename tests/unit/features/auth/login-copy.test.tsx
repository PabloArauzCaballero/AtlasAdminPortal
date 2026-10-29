import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/features/auth/login-page";
import { LoginPinForm } from "@/features/auth/login-pin-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ login, verifyLoginPin: vi.fn() }),
}));

describe("Acceso · textos que dicen qué hacer", () => {
  it("la pista de «Organización» dice qué es y qué hacer si no se conoce", () => {
    render(<LoginPage />);

    expect(
      screen.getByText(/código de tu organización en ATLAS.*pídelo/i),
    ).toBeInTheDocument();
  });

  it("un fallo que no es del servidor (red caída) dice cómo seguir y no borra lo escrito", async () => {
    const user = userEvent.setup();
    login.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/correo interno/i),
      "qa@example.test",
    );
    await user.type(screen.getByLabelText(/contraseña/i), "clave-de-prueba");
    await user.click(
      screen.getByRole("button", { name: /entrar al portal interno/i }),
    );

    expect(
      await screen.findByText(/revisa tu conexión e inténtalo de nuevo/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/correo interno/i)).toHaveValue(
      "qa@example.test",
    );
  });
});

describe("Verificación del código · textos que dicen qué hacer", () => {
  it("explica qué hacer si el código no llega, sin prometer un reenvío que no existe", () => {
    render(
      <LoginPinForm
        expiresInMinutes={10}
        onVerify={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/correo no deseado/i)).toBeInTheDocument();
    expect(screen.queryByText(/reenviar/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Usar otra cuenta" }),
    ).toBeInTheDocument();
  });

  it("un fallo de red al verificar dice cómo seguir", async () => {
    const user = userEvent.setup();
    const onVerify = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    render(
      <LoginPinForm
        expiresInMinutes={10}
        onVerify={onVerify}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/código de verificación/i), "123456");
    await user.click(
      screen.getByRole("button", { name: /confirmar y entrar/i }),
    );

    expect(
      await screen.findByText(/revisa tu conexión e inténtalo de nuevo/i),
    ).toBeInTheDocument();
  });
});
