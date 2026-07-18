import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

/**
 * Se monta el `AuthProvider` real sobre una sesión en storage en vez de mockear
 * `useAuth`: el contrato que importa es "los permisos del token son los que
 * deciden", y un mock de `useAuth` no probaría ese cableado.
 */
function renderGate(
  ui: React.ReactNode,
  { permissions }: { permissions?: string[] } = {},
) {
  if (permissions !== undefined) {
    setStoredInternalSession(makeSession({ user: makeUser({ permissions }) }));
  }
  return render(<AuthProvider>{ui}</AuthProvider>);
}

const SECRETO = "Informe confidencial";
const RESTRINGIDO = "Acceso restringido";

describe("PermissionGate · mode any (por defecto)", () => {
  it("con uno solo de los permisos pedidos ya deja pasar", () => {
    renderGate(
      <PermissionGate permissions={["informes.leer", "informes.exportar"]}>
        {SECRETO}
      </PermissionGate>,
      { permissions: ["informes.exportar"] },
    );

    expect(screen.getByText(SECRETO)).toBeInTheDocument();
  });

  it("sin ninguno de los permisos pedidos no muestra el contenido", () => {
    renderGate(
      <PermissionGate permissions={["informes.leer"]}>
        {SECRETO}
      </PermissionGate>,
      { permissions: ["otra.cosa"] },
    );

    expect(screen.queryByText(SECRETO)).not.toBeInTheDocument();
    expect(screen.getByText(RESTRINGIDO)).toBeInTheDocument();
  });
});

describe("PermissionGate · mode all", () => {
  it("exige todos los permisos, no solo uno", () => {
    renderGate(
      <PermissionGate
        mode="all"
        permissions={["informes.leer", "informes.exportar"]}
      >
        {SECRETO}
      </PermissionGate>,
      { permissions: ["informes.leer"] },
    );

    expect(screen.queryByText(SECRETO)).not.toBeInTheDocument();
  });

  it("deja pasar cuando el usuario tiene todos", () => {
    renderGate(
      <PermissionGate
        mode="all"
        permissions={["informes.leer", "informes.exportar"]}
      >
        {SECRETO}
      </PermissionGate>,
      { permissions: ["informes.leer", "informes.exportar", "extra"] },
    );

    expect(screen.getByText(SECRETO)).toBeInTheDocument();
  });
});

describe("PermissionGate · convenciones", () => {
  it("permissions=[] significa 'cualquier usuario autenticado'", () => {
    renderGate(<PermissionGate permissions={[]}>{SECRETO}</PermissionGate>, {
      permissions: [],
    });

    expect(screen.getByText(SECRETO)).toBeInTheDocument();
  });

  it("un permiso que solo se parece al pedido no vale (sin prefijos ni comodines)", () => {
    renderGate(
      <PermissionGate permissions={["informes.exportar"]}>
        {SECRETO}
      </PermissionGate>,
      { permissions: ["informes.exportar.masivo", "informes."] },
    );

    expect(screen.queryByText(SECRETO)).not.toBeInTheDocument();
  });

  it("sin sesión, un gate con permisos concretos nunca muestra el contenido", () => {
    // Sin `setStoredInternalSession`: el provider arranca con permissions = [].
    renderGate(
      <PermissionGate permissions={["informes.leer"]}>
        {SECRETO}
      </PermissionGate>,
    );

    expect(screen.queryByText(SECRETO)).not.toBeInTheDocument();
  });
});

describe("PermissionGate · fallback", () => {
  it("sin fallback muestra la tarjeta de acceso restringido", () => {
    renderGate(
      <PermissionGate permissions={["informes.leer"]}>
        {SECRETO}
      </PermissionGate>,
      { permissions: [] },
    );

    expect(screen.getByText(RESTRINGIDO)).toBeInTheDocument();
  });

  it("con fallback propio muestra ese y no la tarjeta", () => {
    renderGate(
      <PermissionGate permissions={["informes.leer"]} fallback={<p>Nada</p>}>
        {SECRETO}
      </PermissionGate>,
      { permissions: [] },
    );

    expect(screen.getByText("Nada")).toBeInTheDocument();
    expect(screen.queryByText(RESTRINGIDO)).not.toBeInTheDocument();
  });

  it("fallback={null} no renderiza nada (es el modo 'oculta la acción')", () => {
    // Convención documentada y usada en ~15 sitios (p. ej.
    // data-exports/export-download-action.tsx) para esconder un botón dentro de
    // una fila. Colar ahí la tarjeta de "Acceso restringido" rompe el layout.
    const { container } = renderGate(
      <PermissionGate permissions={["informes.leer"]} fallback={null}>
        {SECRETO}
      </PermissionGate>,
      { permissions: [] },
    );

    expect(screen.queryByText(RESTRINGIDO)).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
