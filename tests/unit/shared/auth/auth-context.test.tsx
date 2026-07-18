import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { AuthProvider, useAuth } from "@/shared/auth/auth-context";
import { emitSessionChange } from "@/shared/auth/session-events";
import {
  getStoredInternalSession,
  setStoredInternalSession,
} from "@/shared/auth/session-storage";
import type { InternalSession } from "@/shared/auth/types";
import {
  makeSession,
  makeSessionExpiringIn,
  makeUser,
} from "../../../helpers/session-fixtures";

/**
 * Se mockea `auth-service` (la costura HTTP) pero NUNCA `auth-context`: lo que
 * se prueba es precisamente el cableado entre storage, session-events y React.
 */
const { loginInternal, getInternalMe, logoutInternal } = vi.hoisted(() => ({
  loginInternal: vi.fn(),
  getInternalMe: vi.fn(),
  logoutInternal: vi.fn(),
}));

vi.mock("@/shared/auth/auth-service", () => ({
  loginInternal,
  getInternalMe,
  logoutInternal,
}));

/**
 * `session-events` conserva su implementación real (el registro de listeners es
 * el mismo que usa `session-storage` al emitir); solo se envuelve la alta/baja
 * para poder contar suscripciones vivas y detectar fugas. React descarta en
 * silencio un `setState` sobre un árbol desmontado, así que sin este contador
 * una suscripción huérfana no tendría ningún efecto observable en el test.
 */
const { suscripcionesVivas } = vi.hoisted(() => ({
  suscripcionesVivas: { count: 0 },
}));

vi.mock("@/shared/auth/session-events", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/shared/auth/session-events")>();
  return {
    ...actual,
    subscribeToSessionChanges: (
      listener: Parameters<typeof actual.subscribeToSessionChanges>[0],
    ) => {
      suscripcionesVivas.count += 1;
      const unsubscribe = actual.subscribeToSessionChanges(listener);
      return () => {
        suscripcionesVivas.count -= 1;
        unsubscribe();
      };
    },
  };
});

type Auth = ReturnType<typeof useAuth>;

let auth: Auth;
/** Una entrada por render, para poder auditar los estados intermedios. */
let renders: Auth[];

function Probe() {
  auth = useAuth();
  renders.push(auth);
  return null;
}

function mountAuth() {
  renders = [];
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

function unauthorized() {
  return new AtlasApiError({
    status: 401,
    code: "UNAUTHORIZED",
    message: "sesión inválida",
  });
}

beforeEach(() => {
  suscripcionesVivas.count = 0;
  logoutInternal.mockResolvedValue({ loggedOut: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("AuthProvider · hidratación", () => {
  it("expone la sesión guardada al montar", () => {
    setStoredInternalSession(
      makeSession({
        user: makeUser({ permissions: ["systems.read"], roles: ["operator"] }),
      }),
    );

    mountAuth();

    expect(auth.user?.email).toBe("user@example.invalid");
    expect(auth.permissions).toEqual(["systems.read"]);
    expect(auth.roles).toEqual(["operator"]);
  });

  it("sin sesión guardada no inventa usuario ni permisos", () => {
    mountAuth();

    expect(auth.user).toBeNull();
    expect(auth.session).toBeNull();
    expect(auth.permissions).toEqual([]);
    expect(auth.roles).toEqual([]);
  });

  it("marca isHydrated una vez terminada la lectura del storage", () => {
    mountAuth();

    expect(auth.isHydrated).toBe(true);
  });

  it("no se declara hidratado en el primer render, antes de leer el storage", () => {
    // El storage se lee en un efecto, que corre DESPUÉS del primer render. Si
    // `isHydrated` arrancase en true, ese render diría "hidratado y sin
    // permisos" y los gates le enseñarían un Forbidden a un usuario legítimo.
    setStoredInternalSession(
      makeSession({ user: makeUser({ permissions: ["systems.read"] }) }),
    );

    mountAuth();

    expect(renders[0].isHydrated).toBe(false);
  });

  it("nunca se declara hidratado con los permisos aún vacíos", () => {
    setStoredInternalSession(
      makeSession({ user: makeUser({ permissions: ["systems.read"] }) }),
    );

    mountAuth();

    const falsoNegativo = renders.some(
      (render) => render.isHydrated && render.permissions.length === 0,
    );
    expect(falsoNegativo).toBe(false);
  });

  it("descarta una sesión local ya vencida antes de hidratar", () => {
    // RESUELTO_ATLAS_REVISION_FINAL: una sesión caducada no debe dar acceso.
    setStoredInternalSession(makeSessionExpiringIn(-60_000));

    mountAuth();

    expect(auth.session).toBeNull();
    expect(auth.permissions).toEqual([]);
  });

  it("una sesión aún vigente sí hidrata", () => {
    setStoredInternalSession(makeSessionExpiringIn(60_000));

    mountAuth();

    expect(auth.session).not.toBeNull();
  });
});

describe("AuthProvider · comprobación de permisos", () => {
  function mountConPermisos(permissions: string[], roles: string[] = []) {
    setStoredInternalSession(
      makeSession({ user: makeUser({ permissions, roles }) }),
    );
    mountAuth();
  }

  it("hasPermission es true solo para un permiso concedido", () => {
    mountConPermisos(["informes.leer"]);

    expect(auth.hasPermission("informes.leer")).toBe(true);
  });

  it("hasPermission es false para un permiso que el usuario no tiene", () => {
    mountConPermisos(["informes.leer"]);

    expect(auth.hasPermission("informes.borrar")).toBe(false);
  });

  it("hasPermission no acepta prefijos ni comodines", () => {
    // "informes." no debe habilitar "informes.borrar".
    mountConPermisos(["informes.", "informes.leer.masivo"]);

    expect(auth.hasPermission("informes.leer")).toBe(false);
  });

  it("hasAnyPermission basta con uno de los pedidos", () => {
    mountConPermisos(["informes.exportar"]);

    expect(auth.hasAnyPermission(["informes.leer", "informes.exportar"])).toBe(
      true,
    );
  });

  it("hasAnyPermission es false si no tiene ninguno", () => {
    mountConPermisos(["otra.cosa"]);

    expect(auth.hasAnyPermission(["informes.leer", "informes.exportar"])).toBe(
      false,
    );
  });

  it("hasAnyPermission([]) es true: convención 'cualquier usuario autenticado'", () => {
    // Carga estructural: el menú usa `permissions: []` para "siempre visible".
    // Si esto devolviera false, ítems como Inicio desaparecerían para todos.
    mountConPermisos([]);

    expect(auth.hasAnyPermission([])).toBe(true);
  });

  it("hasAnyRole es false para un rol que el usuario no tiene", () => {
    mountConPermisos([], ["operator"]);

    expect(auth.hasAnyRole(["admin"])).toBe(false);
  });

  it("hasAnyRole reconoce el rol concedido", () => {
    mountConPermisos([], ["operator"]);

    expect(auth.hasAnyRole(["admin", "operator"])).toBe(true);
  });

  it("hasAnyRole([]) es true: sin restricción de rol", () => {
    mountConPermisos([], []);

    expect(auth.hasAnyRole([])).toBe(true);
  });

  it("sin sesión, hasAnyPermission con permisos concretos es false", () => {
    mountAuth();

    expect(auth.hasAnyPermission(["informes.leer"])).toBe(false);
    expect(auth.hasPermission("informes.leer")).toBe(false);
  });
});

describe("AuthProvider · sincronización con session-events", () => {
  it("un refresh silencioso actualiza los permisos sin refreshProfile manual", () => {
    // RESUELTO_ATLAS_F0_R3: el cliente API reescribe la sesión fuera de React.
    // Sin esta suscripción los gates seguirían decidiendo con permisos viejos.
    setStoredInternalSession(
      makeSession({ user: makeUser({ permissions: ["systems.read"] }) }),
    );
    mountAuth();

    act(() =>
      emitSessionChange(
        makeSession({ user: makeUser({ permissions: ["systems.write"] }) }),
      ),
    );

    expect(auth.hasPermission("systems.write")).toBe(true);
    expect(auth.hasPermission("systems.read")).toBe(false);
    expect(getInternalMe).not.toHaveBeenCalled();
  });

  it("un permiso revocado en el refresh deja de concederse", () => {
    setStoredInternalSession(
      makeSession({
        user: makeUser({ permissions: ["informes.borrar", "informes.leer"] }),
      }),
    );
    mountAuth();

    act(() =>
      emitSessionChange(
        makeSession({ user: makeUser({ permissions: ["informes.leer"] }) }),
      ),
    );

    expect(auth.hasPermission("informes.borrar")).toBe(false);
  });

  it("una emisión de null deja al provider sin sesión", () => {
    setStoredInternalSession(makeSession());
    mountAuth();

    act(() => emitSessionChange(null));

    expect(auth.session).toBeNull();
    expect(auth.permissions).toEqual([]);
  });

  it("se da de baja al desmontar", () => {
    // Una fuga aquí deja providers zombis suscritos de por vida: cada montaje
    // (cada navegación que remonte el árbol) añade uno más, y todos siguen
    // reaccionando a cada refresh de sesión de la pestaña.
    setStoredInternalSession(makeSession());
    const { unmount } = mountAuth();
    expect(suscripcionesVivas.count).toBe(1);

    unmount();

    expect(suscripcionesVivas.count).toBe(0);
  });

  it("montar y desmontar en bucle no acumula suscripciones", () => {
    setStoredInternalSession(makeSession());

    for (let i = 0; i < 3; i += 1) mountAuth().unmount();
    mountAuth();

    expect(suscripcionesVivas.count).toBe(1);
  });

  it("la suscripción se instala antes de leer el storage", () => {
    // El orden importa: si se leyera primero, un refresh que ocurra entre la
    // lectura y la suscripción se perdería para siempre.
    setStoredInternalSession(makeSession());
    mountAuth();

    act(() =>
      emitSessionChange(
        makeSession({ user: makeUser({ permissions: ["llegó"] }) }),
      ),
    );

    expect(auth.hasPermission("llegó")).toBe(true);
  });
});

describe("AuthProvider · login", () => {
  it("expone la sesión devuelta por el backend", async () => {
    loginInternal.mockResolvedValue(
      makeSession({ user: makeUser({ permissions: ["systems.read"] }) }),
    );
    mountAuth();

    await act(() =>
      auth.login({
        tenantId: "t1",
        email: "user@example.invalid",
        password: "x",
      }),
    );

    expect(auth.permissions).toEqual(["systems.read"]);
  });

  it("persiste la sesión para que sobreviva a un remontaje", async () => {
    loginInternal.mockResolvedValue(makeSession());
    mountAuth();

    await act(() =>
      auth.login({
        tenantId: "t1",
        email: "user@example.invalid",
        password: "x",
      }),
    );

    expect(getStoredInternalSession()?.user.email).toBe("user@example.invalid");
  });

  it("un login fallido no deja sesión a medias", async () => {
    loginInternal.mockRejectedValue(unauthorized());
    mountAuth();

    await act(async () => {
      await expect(
        auth.login({ tenantId: "t1", email: "a@b.invalid", password: "mala" }),
      ).rejects.toThrow();
    });

    expect(auth.session).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
  });
});

describe("AuthProvider · logout", () => {
  it("limpia la sesión en memoria y en el storage", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();

    await act(() => auth.logout());

    expect(auth.session).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
  });

  it("el logout local se completa aunque el backend falle", async () => {
    // Si el backend está caído, dejar al operador con la sesión puesta sería
    // peor que perder el registro server-side.
    setStoredInternalSession(makeSession());
    mountAuth();
    logoutInternal.mockRejectedValue(new Error("backend caído"));

    await act(() => auth.logout());

    expect(auth.session).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
  });

  it("envía al backend el refreshToken vigente para revocarlo", async () => {
    // Vía login: en modo cookie el storage descarta los tokens, pero el estado
    // en memoria sí los conserva y es de ahí de donde debe salir.
    loginInternal.mockResolvedValue(
      makeSession({ refreshToken: "refresh-vivo" }),
    );
    mountAuth();
    await act(() =>
      auth.login({ tenantId: "t1", email: "a@b.invalid", password: "x" }),
    );

    await act(() => auth.logout());

    expect(logoutInternal).toHaveBeenCalledWith("refresh-vivo");
  });
});

describe("AuthProvider · refreshProfile", () => {
  it("sustituye los permisos por los que devuelve el servidor", async () => {
    setStoredInternalSession(
      makeSession({ user: makeUser({ permissions: ["viejo"] }) }),
    );
    mountAuth();
    getInternalMe.mockResolvedValue({
      user: makeUser({ permissions: ["nuevo"] }),
    });

    await act(() => auth.refreshProfile().then(() => undefined));

    expect(auth.hasPermission("nuevo")).toBe(true);
    expect(auth.hasPermission("viejo")).toBe(false);
  });

  it("un 401 cierra la sesión y devuelve null en vez de lanzar", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();
    getInternalMe.mockRejectedValue(unauthorized());

    let resultado: InternalSession | null = makeSession();
    await act(async () => {
      resultado = await auth.refreshProfile();
    });

    expect(resultado).toBeNull();
    expect(auth.session).toBeNull();
    expect(getStoredInternalSession()).toBeNull();
  });

  it("un 500 transitorio propaga el error pero NO desloguea", async () => {
    // Un fallo de infraestructura no es una revocación de acceso: expulsar al
    // operador por un 500 le haría perder el trabajo en curso.
    setStoredInternalSession(makeSession());
    mountAuth();
    getInternalMe.mockRejectedValue(
      new AtlasApiError({ status: 500, code: "SERVER", message: "boom" }),
    );

    await act(async () => {
      await expect(auth.refreshProfile()).rejects.toThrow("boom");
    });

    expect(auth.session).not.toBeNull();
    expect(getStoredInternalSession()).not.toBeNull();
  });

  it("sin sesión local delega en el servidor (modo cookie)", async () => {
    // RESUELTO_ATLAS_REVISION_FINAL: con cookies HttpOnly no hay nada guardado
    // localmente, y aun así debe poder recuperarse el perfil.
    mountAuth();
    getInternalMe.mockResolvedValue({
      user: makeUser({ permissions: ["desde.cookie"] }),
    });

    await act(() => auth.refreshProfile().then(() => undefined));

    expect(auth.hasPermission("desde.cookie")).toBe(true);
  });

  it("isRefreshingProfile vuelve a false aunque la llamada falle", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();
    getInternalMe.mockRejectedValue(unauthorized());

    await act(() => auth.refreshProfile().then(() => undefined));

    expect(auth.isRefreshingProfile).toBe(false);
  });

  it("isRefreshingProfile es true mientras la petición está en vuelo", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();
    let resolver: (value: unknown) => void = () => {};
    getInternalMe.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    let pendiente: Promise<unknown> = Promise.resolve();
    await act(() => {
      pendiente = auth.refreshProfile();
      return Promise.resolve();
    });
    expect(auth.isRefreshingProfile).toBe(true);

    await act(async () => {
      resolver({ user: makeUser() });
      await pendiente;
    });
    expect(auth.isRefreshingProfile).toBe(false);
  });
});

describe("AuthProvider · restoreSessionFromServer", () => {
  it("guarda la sesión recuperada del servidor", async () => {
    mountAuth();
    getInternalMe.mockResolvedValue({
      user: makeUser({ permissions: ["restaurado"] }),
    });

    await act(() => auth.restoreSessionFromServer().then(() => undefined));

    expect(auth.hasPermission("restaurado")).toBe(true);
    expect(getStoredInternalSession()).not.toBeNull();
  });

  it("un 403 devuelve null en lugar de lanzar", async () => {
    mountAuth();
    getInternalMe.mockRejectedValue(
      new AtlasApiError({ status: 403, code: "FORBIDDEN", message: "no" }),
    );

    let resultado: InternalSession | null = makeSession();
    await act(async () => {
      resultado = await auth.restoreSessionFromServer();
    });

    expect(resultado).toBeNull();
  });

  it("un error de red se propaga: no es lo mismo que 'no autenticado'", async () => {
    setStoredInternalSession(makeSession());
    mountAuth();
    getInternalMe.mockRejectedValue(new TypeError("Failed to fetch"));

    await act(async () => {
      await expect(auth.restoreSessionFromServer()).rejects.toThrow(
        "Failed to fetch",
      );
    });
  });
});

describe("useAuth", () => {
  it("falla de forma explícita si se usa fuera del AuthProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(
      "useAuth debe usarse dentro de AuthProvider.",
    );
  });

  it("el árbol dentro del provider se renderiza con normalidad", () => {
    render(
      <AuthProvider>
        <p>contenido interno</p>
      </AuthProvider>,
    );

    expect(screen.getByText("contenido interno")).toBeInTheDocument();
  });
});
