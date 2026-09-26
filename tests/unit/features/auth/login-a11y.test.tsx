import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/features/auth/login-page";
import { findA11yViolations } from "../../../helpers/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe("Login · accesibilidad y contrato", () => {
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
});
