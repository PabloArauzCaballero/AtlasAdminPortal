import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { UserMenu } from "@/shared/components/layout/internal-shell/user-menu";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

const { logoutInternal } = vi.hoisted(() => ({
  logoutInternal: vi.fn().mockResolvedValue({ loggedOut: true }),
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal,
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

function renderMenu() {
  setStoredInternalSession(makeSession({ user: makeUser({}) }));
  return render(
    <AuthProvider>
      <UserMenu />
    </AuthProvider>,
  );
}

afterEach(cleanup);

describe("UserMenu · quién está sentado, en la barra superior", () => {
  it("identifica al usuario de la sesión y su nombre lleva a «Mi cuenta»", () => {
    renderMenu();

    expect(screen.getByText("Usuario De Prueba")).toBeInTheDocument();
    expect(screen.getByText("user@example.invalid")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mi cuenta: Usuario De Prueba" }),
    ).toHaveAttribute("href", "/internal/settings/profile");
  });

  it("cerrar sesión revoca el refresh token en el backend", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /Cerrar sesión/ }));

    expect(logoutInternal).toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem("atlas_internal_session_v3"),
    ).toBeNull();
  });
});
