import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/shared/auth/auth-context";
import { setStoredInternalSession } from "@/shared/auth/session-storage";
import { AppSidebar } from "@/shared/components/layout/internal-shell/app-sidebar";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

const { logoutInternal } = vi.hoisted(() => ({
  logoutInternal: vi.fn().mockResolvedValue({ loggedOut: true }),
}));
vi.mock("@/shared/auth/auth-service", () => ({
  logoutInternal,
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
}));

/**
 * Se monta el `AuthProvider` real sobre `navGroups` reales: el contrato que
 * importa es "el menú solo enseña lo que los permisos del token conceden", y
 * probarlo con un nav de mentira no diría nada sobre el menú que se despliega.
 */
function renderSidebar({
  permissions = [] as string[],
  roles = [] as string[],
  pathname = "/internal",
} = {}) {
  usePathname.mockReturnValue(pathname);
  setStoredInternalSession(
    makeSession({ user: makeUser({ permissions, roles }) }),
  );
  return render(
    <AuthProvider>
      <AppSidebar />
    </AuthProvider>,
  );
}

function verEnlace(nombre: string) {
  return screen.queryAllByRole("link", { name: nombre }).length > 0;
}

function verGrupo(nombre: string) {
  return screen.queryByRole("button", { name: nombre }) !== null;
}

describe("AppSidebar · filtrado por permisos", () => {
  it("oculta un ítem cuyo permiso el usuario no tiene", () => {
    renderSidebar({ permissions: ["audit.events.read"] });

    expect(verEnlace("Usuarios internos")).toBe(false);
  });

  it("muestra el ítem en cuanto el permiso está concedido", () => {
    renderSidebar({ permissions: ["internal.users.read"] });

    expect(verEnlace("Usuarios internos")).toBe(true);
  });

  it("un permiso solo abre su propio ítem, no los vecinos del grupo", () => {
    // "Herramientas" pide systems.tools.read; tenerlo no debe conceder
    // "Salud herramientas" (systems.tools.health.read).
    renderSidebar({ permissions: ["systems.tools.read"] });

    expect(verEnlace("Herramientas")).toBe(true);
    expect(verEnlace("Salud herramientas")).toBe(false);
  });

  it("un ítem con varios permisos se abre con cualquiera de ellos", () => {
    // "Panel de control" declara systems.endpoints.read y systems.tools.health.read.
    renderSidebar({ permissions: ["systems.tools.health.read"] });

    expect(verEnlace("Panel de control")).toBe(true);
  });

  it("un ítem con permissions: [] es visible sin ningún permiso", () => {
    // Convención load-bearing: `permissions: []` significa "cualquier usuario
    // interno autenticado". Si `hasAnyPermission([])` devolviera false, estos
    // ítems desaparecerían del menú para todo el mundo.
    renderSidebar({ permissions: [] });

    expect(verEnlace("Perfil")).toBe(true);
    expect(verEnlace("Seguridad sesión")).toBe(true);
  });

  it("los ítems raíz (Inicio) se ven siempre", () => {
    renderSidebar({ permissions: [] });

    expect(verEnlace("Inicio")).toBe(true);
  });
});

describe("AppSidebar · filtrado por rol", () => {
  it("un ítem restringido por rol no se ve sin ese rol, aunque no pida permisos", () => {
    // "Formularios" tiene permissions: [] pero roles: ["SUPER_ADMIN"]. Si el
    // filtro mirara solo permisos, se colaría para cualquier autenticado.
    renderSidebar({ permissions: [], roles: ["operator"] });

    expect(verEnlace("Formularios")).toBe(false);
  });

  it("con el rol exigido, el ítem aparece", () => {
    renderSidebar({ permissions: [], roles: ["SUPER_ADMIN"] });

    expect(verEnlace("Formularios")).toBe(true);
  });

  it("un ítem sin roles declarados no exige rol alguno", () => {
    renderSidebar({ permissions: [], roles: [] });

    expect(verEnlace("Cola de trabajo")).toBe(true);
  });
});

describe("AppSidebar · grupos", () => {
  it("un grupo sin ningún ítem visible desaparece entero", () => {
    // No debe quedar la cabecera "Systems Ops" abriendo un cajón vacío.
    renderSidebar({ permissions: [] });

    expect(verGrupo("Systems Ops")).toBe(false);
  });

  it("basta un ítem visible para que el grupo aparezca", () => {
    renderSidebar({ permissions: ["systems.tools.read"] });

    expect(verGrupo("Systems Ops")).toBe(true);
  });

  it("el grupo aparece con solo los ítems concedidos dentro", () => {
    renderSidebar({ permissions: ["internal.roles.read"] });

    expect(verGrupo("Administración")).toBe(true);
    expect(verEnlace("Roles internos")).toBe(true);
    expect(verEnlace("Permisos internos")).toBe(false);
    expect(verEnlace("Sync catálogo")).toBe(false);
  });

  it("el grupo se puede plegar y desplegar desde su cabecera", async () => {
    const user = userEvent.setup();
    renderSidebar({ permissions: ["audit.events.read"] });
    const cabecera = screen.getByRole("button", {
      name: "Seguridad y auditoría",
    });

    await user.click(cabecera);
    await user.click(cabecera);

    // Plegar es solo visual (grid-rows-[0fr]): los enlaces siguen en el DOM.
    // Aquí solo se comprueba que el toggle no destruye el grupo ni sus ítems.
    expect(verEnlace("Terminal backend")).toBe(true);
  });

  it("la cabecera anuncia si el grupo está desplegado o plegado", async () => {
    // Es un botón de tipo "disclosure": sin `aria-expanded` un lector de
    // pantalla no puede saber si el cajón está abierto, y como el plegado es
    // puramente visual (CSS) tampoco hay ninguna otra pista accesible.
    const user = userEvent.setup();
    renderSidebar({ permissions: ["audit.events.read"] });
    const cabecera = screen.getByRole("button", {
      name: "Seguridad y auditoría",
    });
    expect(cabecera).toHaveAttribute("aria-expanded", "false");

    await user.click(cabecera);

    expect(cabecera).toHaveAttribute("aria-expanded", "true");
  });

  it("el grupo que contiene la ruta actual empieza desplegado", async () => {
    // Si el grupo de la vista en la que estás apareciera plegado, el ítem
    // activo quedaría escondido.
    renderSidebar({
      permissions: ["audit.events.read"],
      pathname: "/internal/audit",
    });

    expect(
      screen.getByRole("button", { name: "Seguridad y auditoría" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});

describe("AppSidebar · enlaces y sesión", () => {
  it("cada ítem visible apunta a su ruta interna", () => {
    renderSidebar({ permissions: ["audit.events.read"] });

    expect(
      screen.getByRole("link", { name: "Terminal backend" }),
    ).toHaveAttribute("href", "/internal/audit");
  });

  it("identifica al usuario de la sesión", () => {
    renderSidebar({ permissions: [] });

    expect(screen.getByText("Usuario De Prueba")).toBeInTheDocument();
    expect(screen.getByText("user@example.invalid")).toBeInTheDocument();
  });

  it("cerrar sesión revoca el refresh token en el backend", async () => {
    const user = userEvent.setup();
    renderSidebar({ permissions: [] });

    await user.click(screen.getByRole("button", { name: /Cerrar sesión/ }));

    expect(logoutInternal).toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem("atlas_internal_session_v3"),
    ).toBeNull();
  });
});
