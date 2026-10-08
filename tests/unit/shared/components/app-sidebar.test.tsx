import { cleanup, render, screen } from "@testing-library/react";
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

function destinoDe(nombre: string) {
  return screen.queryByRole("link", { name: nombre })?.getAttribute("href");
}

function verGrupo(nombre: string) {
  return screen.queryByRole("button", { name: nombre }) !== null;
}

describe("AppSidebar · filtrado por permisos", () => {
  it("oculta un ítem cuyo permiso el usuario no tiene", () => {
    renderSidebar({ permissions: ["audit.events.read"] });

    expect(verEnlace("Usuarios y accesos")).toBe(false);
  });

  it("muestra el ítem en cuanto el permiso está concedido", () => {
    renderSidebar({ permissions: ["internal.users.read"] });

    expect(verEnlace("Usuarios y accesos")).toBe(true);
  });

  it("un permiso solo abre su propio ítem, no los vecinos del grupo", () => {
    // "Herramientas" pide systems.tools.read; tenerlo no debe conceder
    // "Salud herramientas" (systems.tools.health.read).
    renderSidebar({ permissions: ["systems.tools.read"] });

    expect(verEnlace("Herramientas")).toBe(true);
    expect(verEnlace("Salud herramientas")).toBe(false);
  });

  it("un ítem con varios permisos se abre con cualquiera de ellos", () => {
    // «Panel de control» (que era el ejemplo) se fusionó con Inicio; «Sync catálogo» declara
    // varios permisos de sistemas y basta con el último.
    renderSidebar({ permissions: ["systems.tools.inferRequirements"] });

    expect(verEnlace("Actualizar inventario")).toBe(true);
  });

  it("un ítem con permissions: [] es visible sin ningún permiso", () => {
    // Convención load-bearing: `permissions: []` significa "cualquier usuario
    // interno autenticado". Si `hasAnyPermission([])` devolviera false, estos
    // ítems desaparecerían del menú para todo el mundo.
    renderSidebar({ permissions: [] });

    // «Esquema» agrupa dos pestañas sin permiso declarado: sale para cualquiera.
    expect(destinoDe("Esquema")).toBe("/internal/schema/versions");
  });

  it("el logo es el enlace a Inicio; Inicio y Mis notificaciones ya no son renglones del menú", () => {
    renderSidebar({ permissions: [] });

    expect(destinoDe("ATLAS · Ir al inicio")).toBe("/internal");
    expect(verEnlace("Inicio")).toBe(false);
    expect(verEnlace("Mis notificaciones")).toBe(false);
  });
});

describe("AppSidebar · una entrada fusionada sale por sus pestañas", () => {
  it("«Comercios» no sale si no se puede ver ni expedientes ni usuarios", () => {
    // Con `permissions: []` «Usuarios de comercio» salía para todo el mundo y
    // `GET /merchant/users/provisioning-requests` respondía 403 a quien no lo tenía.
    renderSidebar({ permissions: [], roles: ["compliance_analyst"] });
    expect(verEnlace("Comercios")).toBe(false);
  });

  it("«Comercios» lleva a la primera pestaña que la sesión puede abrir", () => {
    // Sin el rol de PartnerOperationsController pero con el permiso de usuarios: entra por ahí,
    // no por un «sin acceso» de expedientes.
    renderSidebar({
      permissions: ["merchant.users.read"],
      roles: ["compliance_analyst"],
    });
    expect(destinoDe("Comercios")).toBe("/internal/merchant-users");
    cleanup();

    renderSidebar({ permissions: [], roles: ["risk_analyst"] });
    expect(destinoDe("Comercios")).toBe("/internal/operations/partners");
  });

  it("las pantallas fusionadas ya no tienen línea propia en el menú", () => {
    renderSidebar({
      permissions: ["merchant.users.read"],
      roles: ["admin"],
    });
    for (const retirada of [
      "Usuarios de comercio",
      "Expedientes de comercio",
      "Agentes de soporte",
      "Base de conocimiento",
      "Contactos sin verificar",
      "Avisos de pago",
      "Campañas",
    ]) {
      expect(verEnlace(retirada)).toBe(false);
    }
  });

  it("la entrada queda activa en cualquiera de sus pantallas hermanas", () => {
    renderSidebar({
      permissions: [],
      roles: ["admin"],
      pathname: "/internal/support/agents",
    });
    // El grupo se abre solo porque una de sus entradas está activa.
    expect(screen.getByRole("button", { name: "Operaciones" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

describe("AppSidebar · filtrado por rol", () => {
  it("un ítem sin roles declarados no exige rol alguno", () => {
    renderSidebar({ permissions: [], roles: [] });

    // La pestaña «Casos» de Soporte no declara roles: la entrada sale para cualquiera.
    expect(destinoDe("Soporte")).toBe("/internal/support");
  });

  it("un ítem restringido por rol no se ve sin ese rol, aunque no pida permisos", () => {
    // «Productos de crédito» tiene permissions: [] pero roles de CreditOperationsController. Si el
    // filtro mirara solo permisos, se colaría para cualquier autenticado.
    renderSidebar({ permissions: [], roles: ["operator"] });
    expect(verEnlace("Productos de crédito")).toBe(false);
    cleanup();

    renderSidebar({ permissions: [], roles: ["admin"] });
    expect(verEnlace("Productos de crédito")).toBe(true);
  });
});

describe("AppSidebar · grupos", () => {
  it("un grupo sin ningún ítem visible desaparece entero", () => {
    // No debe quedar la cabecera "Systems Ops" abriendo un cajón vacío.
    renderSidebar({ permissions: [] });

    expect(verGrupo("Sistemas")).toBe(false);
  });

  it("basta un ítem visible para que el grupo aparezca", () => {
    renderSidebar({ permissions: ["systems.tools.read"] });

    expect(verGrupo("Sistemas")).toBe(true);
  });

  it("el grupo aparece con solo los ítems concedidos dentro", () => {
    renderSidebar({ permissions: ["internal.roles.read"] });

    expect(verGrupo("Administración")).toBe(true);
    // Sólo puede abrir «Roles»: la entrada lleva ahí, no a «Usuarios».
    expect(destinoDe("Usuarios y accesos")).toBe("/internal/settings/roles");
    expect(verEnlace("Registro del sistema")).toBe(false);
  });

  it("Procesos vive en Operaciones, visible sólo con workflows.read", () => {
    renderSidebar({ permissions: ["workflows.read"] });

    expect(verGrupo("Procesos")).toBe(false);
    expect(destinoDe("Procesos")).toBe("/internal/procesos");
    // No cuelga de Systems Ops: quien sólo lee procesos no ve ese grupo.
    expect(verGrupo("Sistemas")).toBe(false);
  });

  it("tras la fusión, Systems Ops no lista «Procesos de negocio», «Panel de control» ni «Salud herramientas»", () => {
    renderSidebar({
      permissions: [
        "systems.flows.read",
        "systems.endpoints.read",
        "systems.tools.read",
        "systems.tools.health.read",
        "systems.reviewQueue.read",
      ],
    });

    for (const retirado of [
      "Procesos de negocio",
      "Panel de control",
      "Salud herramientas",
      "Flujos",
      "Cola de revisión",
      "Revisión de flujos",
    ])
      expect(verEnlace(retirado), retirado).toBe(false);
    // Las cinco vistas del mapa son una entrada; la revisión del catálogo es pestaña de «Catálogo
    // de datos» y, con sólo ese permiso, la entrada lleva a ella.
    for (const retirado of [
      "Revisión del catálogo",
      "Revisión de análisis de flujos",
      "Trabajo pendiente",
      "Deriva de permisos",
    ])
      expect(verEnlace(retirado), retirado).toBe(false);
    for (const nuevo of ["Mapa de rutas", "Herramientas"])
      expect(verEnlace(nuevo), nuevo).toBe(true);
    expect(destinoDe("Catálogo de datos")).toBe("/internal/review-queue");
  });

  it("sin workflows.read la entrada Procesos no aparece", () => {
    renderSidebar({ permissions: ["systems.flows.read"] });

    expect(verEnlace("Procesos")).toBe(false);
  });

  it("el grupo se puede plegar y desplegar desde su cabecera", async () => {
    const user = userEvent.setup();
    renderSidebar({ permissions: ["audit.events.read"] });
    const cabecera = screen.getByRole("button", {
      name: "Administración",
    });

    await user.click(cabecera);
    await user.click(cabecera);

    // Plegar es solo visual (grid-rows-[0fr]): los enlaces siguen en el DOM.
    // Aquí solo se comprueba que el toggle no destruye el grupo ni sus ítems.
    expect(verEnlace("Registro del sistema")).toBe(true);
  });

  it("la cabecera anuncia si el grupo está desplegado o plegado", async () => {
    // Es un botón de tipo "disclosure": sin `aria-expanded` un lector de
    // pantalla no puede saber si el cajón está abierto, y como el plegado es
    // puramente visual (CSS) tampoco hay ninguna otra pista accesible.
    const user = userEvent.setup();
    renderSidebar({ permissions: ["audit.events.read"] });
    const cabecera = screen.getByRole("button", {
      name: "Administración",
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
      screen.getByRole("button", { name: "Administración" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});

describe("AppSidebar · enlaces y sesión", () => {
  it("cada ítem visible apunta a su ruta interna", () => {
    renderSidebar({ permissions: ["audit.events.read"] });

    expect(
      screen.getByRole("link", { name: "Registro del sistema" }),
    ).toHaveAttribute("href", "/internal/audit");
  });

  it("el usuario y la salida ya no viven al pie de la barra: están en la barra superior", () => {
    renderSidebar({ permissions: [] });

    expect(screen.queryByText("Usuario De Prueba")).toBeNull();
    expect(screen.queryByRole("button", { name: /Cerrar sesión/ })).toBeNull();
  });
});

describe("AppSidebar · fusiones WP2 (2026-09-29)", () => {
  it("«Definiciones del motor» sale con el permiso de su pantalla, no con el del glosario", () => {
    // Es pestaña de «Dominios y glosario»: con sólo su permiso, la entrada lleva a ella.
    renderSidebar({ permissions: ["operations.definitions.read"], roles: [] });
    expect(destinoDe("Dominios y glosario")).toBe(
      "/internal/business-metadata/definitions",
    );
    cleanup();

    renderSidebar({ permissions: ["businessMetadata.read"], roles: [] });
    expect(destinoDe("Dominios y glosario")).toBe(
      "/internal/business-metadata/domains",
    );
  });

  it("ya no hay «Alertas» ni «Formularios»: son la bandeja de calidad y Versiones de esquema", () => {
    renderSidebar({
      permissions: ["dataQuality.issues.read"],
      roles: ["SUPER_ADMIN", "admin"],
    });
    expect(verEnlace("Alertas")).toBe(false);
    expect(verEnlace("Formularios")).toBe(false);
    expect(destinoDe("Calidad de datos")).toBe("/internal/data-quality/issues");
  });
});
