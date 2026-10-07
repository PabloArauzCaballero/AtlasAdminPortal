import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { SectionTabs } from "@/shared/components/layout/internal-shell/section-tabs";
import { makeSession, makeUser } from "../../../../helpers/session-fixtures";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

function renderTabs({
  pathname,
  permissions = [] as string[],
  roles = [] as string[],
}: {
  pathname: string;
  permissions?: string[];
  roles?: string[];
}) {
  usePathname.mockReturnValue(pathname);
  setStoredInternalSession(
    makeSession({ user: makeUser({ permissions, roles }) }),
  );
  return render(
    <AuthProvider>
      <SectionTabs />
    </AuthProvider>,
  );
}

const pestañas = () =>
  screen.queryAllByRole("link").map((link) => link.textContent);

describe("SectionTabs · la fila de pestañas de una entrada fusionada", () => {
  it("enseña las pantallas hermanas y marca la actual", () => {
    renderTabs({ pathname: "/internal/support/knowledge", roles: ["admin"] });

    expect(screen.getByRole("navigation", { name: "Soporte" })).toBeVisible();
    expect(pestañas()).toEqual(["Casos", "Base de conocimiento", "Agentes"]);
    expect(
      screen.getByRole("link", { name: "Base de conocimiento" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Casos" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("fusionar no concede nada: sólo salen las pestañas que la sesión puede abrir", () => {
    // `risk_analyst` redacta ayuda pero no habilita agentes.
    renderTabs({ pathname: "/internal/support", roles: ["risk_analyst"] });

    expect(pestañas()).toEqual(["Casos", "Base de conocimiento"]);
  });

  it("con una sola pestaña a la vista no se pinta la fila", () => {
    renderTabs({ pathname: "/internal/support", roles: ["fraud_analyst"] });

    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("una pantalla sin hermanas, o un detalle, no lleva fila", () => {
    renderTabs({ pathname: "/internal/files", roles: ["admin"] });
    expect(screen.queryByRole("navigation")).toBeNull();

    renderTabs({
      pathname: "/internal/operations/loans/123",
      roles: ["admin"],
    });
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
