import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { AppSidebar } from "@/shared/components/layout/internal-shell/app-sidebar";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal: vi.fn().mockResolvedValue({ loggedOut: true }),
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

/**
 * El menú de «Motor de decisiones» sigue los @Roles de `DecisionArtifactBindingController`
 * (internal_operator, risk_analyst, admin, platform_admin), no `governance.policies.read`: con el
 * permiso, riesgo no veía la pantalla que el backend le abre y cumplimiento veía una que le da 403.
 */
function renderSidebar(permissions: string[], legacyRoles: string[]) {
  usePathname.mockReturnValue("/internal");
  setStoredInternalSession(
    makeSession({
      user: makeUser({ permissions, roles: [], legacyRoles }),
    }),
  );
  return render(
    <AuthProvider>
      <AppSidebar />
    </AuthProvider>,
  );
}

const verEnlace = (nombre: string) =>
  screen.queryAllByRole("link", { name: nombre }).length > 0;

describe("AppSidebar · Motor de decisiones", () => {
  it("lo enseña a riesgo, aunque no tenga permisos de gobierno", () => {
    renderSidebar(["operations.riskPolicy.read"], ["risk_analyst"]);
    expect(verEnlace("Motor de decisiones")).toBe(true);
  });

  it("no lo enseña a cumplimiento, que el backend rechaza con 403", () => {
    renderSidebar(["governance.policies.read"], ["compliance_analyst"]);
    expect(verEnlace("Motor de decisiones")).toBe(false);
    // Testigo positivo: el mismo permiso sí le abre sus pantallas de gobierno.
    expect(verEnlace("Políticas gobierno")).toBe(true);
  });
});

describe("AppSidebar · colas de casos", () => {
  it("monta «Revisión manual» y «Casos de fraude» para operación", () => {
    renderSidebar([], ["internal_operator"]);
    expect(verEnlace("Revisión manual")).toBe(true);
    expect(verEnlace("Casos de fraude")).toBe(true);
  });

  it("fraude ve su cola, no la de revisión manual que el backend le niega", () => {
    renderSidebar([], ["fraud_analyst"]);
    expect(verEnlace("Casos de fraude")).toBe(true);
    expect(verEnlace("Revisión manual")).toBe(false);
  });
});
