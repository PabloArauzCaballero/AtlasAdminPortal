import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { RoleGate } from "@/shared/auth/role-gate";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

function renderGate(ui: React.ReactNode, { roles }: { roles?: string[] } = {}) {
  if (roles !== undefined) {
    setStoredInternalSession(makeSession({ user: makeUser({ roles }) }));
  }
  return render(<AuthProvider>{ui}</AuthProvider>);
}

const ACCION = "Aprobar versión";
const RESTRINGIDO = "Acceso restringido";

describe("RoleGate · decisión de acceso", () => {
  it("con uno de los roles pedidos deja pasar", () => {
    renderGate(
      <RoleGate roles={["SUPER_ADMIN", "AUDITOR"]}>{ACCION}</RoleGate>,
      { roles: ["AUDITOR"] },
    );

    expect(screen.getByText(ACCION)).toBeInTheDocument();
  });

  it("un rol distinto no ve el contenido", () => {
    renderGate(<RoleGate roles={["SUPER_ADMIN"]}>{ACCION}</RoleGate>, {
      roles: ["operator"],
    });

    expect(screen.queryByText(ACCION)).not.toBeInTheDocument();
    expect(screen.getByText(RESTRINGIDO)).toBeInTheDocument();
  });

  it("sin sesión no ve el contenido", () => {
    renderGate(<RoleGate roles={["SUPER_ADMIN"]}>{ACCION}</RoleGate>);

    expect(screen.queryByText(ACCION)).not.toBeInTheDocument();
  });

  it("distingue mayúsculas: 'super_admin' no es 'SUPER_ADMIN'", () => {
    // Comparación exacta a propósito; se fija aquí para que un cambio de
    // normalización en el backend no pase desapercibido.
    renderGate(<RoleGate roles={["SUPER_ADMIN"]}>{ACCION}</RoleGate>, {
      roles: ["super_admin"],
    });

    expect(screen.queryByText(ACCION)).not.toBeInTheDocument();
  });

  it("roles=[] significa 'cualquier usuario autenticado'", () => {
    renderGate(<RoleGate roles={[]}>{ACCION}</RoleGate>, { roles: [] });

    expect(screen.getByText(ACCION)).toBeInTheDocument();
  });
});

describe("RoleGate · fallback", () => {
  it("con fallback propio muestra ese y no la tarjeta", () => {
    renderGate(
      <RoleGate roles={["SUPER_ADMIN"]} fallback={<p>Solo lectura</p>}>
        {ACCION}
      </RoleGate>,
      { roles: [] },
    );

    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.queryByText(RESTRINGIDO)).not.toBeInTheDocument();
  });

  it("fallback={null} no renderiza nada", () => {
    // Igual que en PermissionGate: los call sites (catalog-version-actions,
    // schema-versions-page…) esconden botones sueltos, no secciones enteras.
    const { container } = renderGate(
      <RoleGate roles={["SUPER_ADMIN"]} fallback={null}>
        {ACCION}
      </RoleGate>,
      { roles: [] },
    );

    expect(screen.queryByText(RESTRINGIDO)).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
