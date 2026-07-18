import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredInternalSession,
  getStoredInternalSession,
  setStoredInternalSession,
} from "@/shared/auth/session-storage";
import type { InternalSession } from "@/shared/auth/types";

const SESSION_KEY = "atlas_internal_session_v3";
const LEGACY_SESSION_KEY = "atlas_internal_session_v2";
const LEGACY_LOCAL_STORAGE_KEY = "atlas_internal_session_v1";

function validSession(
  overrides: Partial<InternalSession> = {},
): InternalSession {
  return {
    accessToken: "tok_1",
    refreshToken: "rt_1",
    tokenType: "Bearer",
    user: {
      id: "1",
      tenantId: "acme",
      email: "qa@atlas.internal",
      fullName: "QA Operator",
      status: "ACTIVE",
      roles: ["INTERNAL_ADMIN"],
      permissions: ["internal.users.manage"],
    },
    ...overrides,
  };
}

function writeRaw(key: string, value: unknown, storage: Storage) {
  storage.setItem(key, JSON.stringify(value));
}

beforeEach(() => {
  // Modo bearer: es el único en el que los tokens se persisten y se puede
  // observar el ida y vuelta completo del storage.
  vi.stubEnv("NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE", "session");
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("getStoredInternalSession · lectura", () => {
  it("devuelve null cuando no hay nada guardado", () => {
    expect(getStoredInternalSession()).toBeNull();
  });

  it("recupera la sesión guardada", () => {
    setStoredInternalSession(validSession());

    const restored = getStoredInternalSession();

    expect(restored?.user.email).toBe("qa@atlas.internal");
    expect(restored?.accessToken).toBe("tok_1");
  });

  it("devuelve null si el JSON guardado está corrupto", () => {
    // Otro tab o una versión vieja pueden dejar basura: reventar aquí dejaría
    // el portal en blanco en el arranque, sin forma de recuperarse.
    window.sessionStorage.setItem(SESSION_KEY, "{no-es-json");

    expect(getStoredInternalSession()).toBeNull();
  });

  it("descarta una sesión sin email", () => {
    writeRaw(SESSION_KEY, { user: { permissions: [] } }, window.sessionStorage);

    expect(getStoredInternalSession()).toBeNull();
  });

  it("descarta una sesión sin usuario", () => {
    writeRaw(SESSION_KEY, { accessToken: "tok" }, window.sessionStorage);

    expect(getStoredInternalSession()).toBeNull();
  });

  it("descarta una sesión cuyos permisos no son un array", () => {
    // Es la defensa contra guardar el payload crudo del backend, que trae
    // `effectivePermissions: [{key}]` en vez de `permissions: string[]`.
    writeRaw(
      SESSION_KEY,
      { user: { email: "qa@atlas.internal", permissions: { a: 1 } } },
      window.sessionStorage,
    );

    expect(getStoredInternalSession()).toBeNull();
  });

  it("rellena roles y legacyRoles ausentes con listas vacías", () => {
    // Los consumidores hacen `.includes(...)` directo sobre ambos.
    writeRaw(
      SESSION_KEY,
      {
        accessToken: "tok",
        user: { email: "qa@atlas.internal", permissions: [] },
      },
      window.sessionStorage,
    );

    const restored = getStoredInternalSession();

    expect(restored?.user.roles).toEqual([]);
    expect(restored?.user.legacyRoles).toEqual([]);
  });

  it("infiere tokenType Bearer cuando hay accessToken y no venía el campo", () => {
    writeRaw(
      SESSION_KEY,
      {
        accessToken: "tok",
        user: { email: "qa@atlas.internal", permissions: [] },
      },
      window.sessionStorage,
    );

    expect(getStoredInternalSession()?.tokenType).toBe("Bearer");
  });

  it("infiere tokenType Cookie cuando no hay accessToken", () => {
    // Decide si el cliente manda Authorization o confía en la cookie HttpOnly.
    writeRaw(
      SESSION_KEY,
      { user: { email: "qa@atlas.internal", permissions: [] } },
      window.sessionStorage,
    );

    expect(getStoredInternalSession()?.tokenType).toBe("Cookie");
  });
});

describe("getStoredInternalSession · expiración", () => {
  it("descarta y borra una sesión ya expirada", () => {
    // Devolverla dejaría al operador con una UI que parece viva y falla en cada
    // petición con 401.
    setStoredInternalSession(
      validSession({
        session: { expiresAt: new Date(Date.now() - 1_000).toISOString() },
      }),
    );

    expect(getStoredInternalSession()).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("conserva una sesión que aún no expira", () => {
    setStoredInternalSession(
      validSession({
        session: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
      }),
    );

    expect(getStoredInternalSession()).not.toBeNull();
  });

  it("conserva una sesión sin fecha de expiración", () => {
    setStoredInternalSession(validSession());

    expect(getStoredInternalSession()).not.toBeNull();
  });
});

describe("getStoredInternalSession · migración de claves legadas", () => {
  it("migra una sesión v2 de sessionStorage a la clave v3", () => {
    // Sin la migración, un despliegue que cambia la clave desloguea a todos.
    writeRaw(LEGACY_SESSION_KEY, validSession(), window.sessionStorage);

    const restored = getStoredInternalSession();

    expect(restored?.user.email).toBe("qa@atlas.internal");
    expect(window.sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("borra la clave v2 tras migrarla, para no volver a leerla", () => {
    writeRaw(LEGACY_SESSION_KEY, validSession(), window.sessionStorage);

    getStoredInternalSession();

    expect(window.sessionStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });

  it("migra una sesión v1 de localStorage y la saca de ahí", () => {
    // v1 vivía en localStorage: dejarla ahí mantiene los tokens sobreviviendo
    // al cierre del navegador, que es justo lo que v3 quiso evitar.
    writeRaw(LEGACY_LOCAL_STORAGE_KEY, validSession(), window.localStorage);

    const restored = getStoredInternalSession();

    expect(restored?.user.email).toBe("qa@atlas.internal");
    expect(window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("la clave v3 gana a la legada cuando ambas existen", () => {
    writeRaw(
      SESSION_KEY,
      validSession({
        user: { ...validSession().user, email: "nueva@atlas.internal" },
      }),
      window.sessionStorage,
    );
    writeRaw(LEGACY_SESSION_KEY, validSession(), window.sessionStorage);

    expect(getStoredInternalSession()?.user.email).toBe("nueva@atlas.internal");
  });

  it("no migra una sesión legada ya expirada", () => {
    writeRaw(
      LEGACY_SESSION_KEY,
      validSession({
        session: { expiresAt: new Date(Date.now() - 1_000).toISOString() },
      }),
      window.sessionStorage,
    );

    expect(getStoredInternalSession()).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });

  it("ignora una sesión legada corrupta sin lanzar", () => {
    window.sessionStorage.setItem(LEGACY_SESSION_KEY, "{roto");

    expect(getStoredInternalSession()).toBeNull();
  });
});

describe("setStoredInternalSession", () => {
  it("guarda la sesión bajo la clave v3", () => {
    setStoredInternalSession(validSession());

    expect(window.sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("limpia las claves legadas al guardar", () => {
    // Si no, un rollback leería la sesión vieja de v2/v1 y pisaría la actual.
    writeRaw(LEGACY_SESSION_KEY, validSession(), window.sessionStorage);
    writeRaw(LEGACY_LOCAL_STORAGE_KEY, validSession(), window.localStorage);

    setStoredInternalSession(validSession());

    expect(window.sessionStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("en modo cookie no persiste los tokens en el storage", () => {
    // La garantía de seguridad del modo por defecto: un XSS no puede leer del
    // sessionStorage un token que nunca se escribió.
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_AUTH_STORAGE_MODE", "cookie");

    setStoredInternalSession(validSession());

    const raw = window.sessionStorage.getItem(SESSION_KEY) ?? "";
    expect(raw).not.toContain("tok_1");
    expect(raw).not.toContain("rt_1");
    // La sesión sigue siendo utilizable: se conserva el usuario.
    expect(getStoredInternalSession()?.user.email).toBe("qa@atlas.internal");
  });

  it("en modo session sí persiste los tokens (compatibilidad bearer local)", () => {
    setStoredInternalSession(validSession());

    expect(getStoredInternalSession()?.accessToken).toBe("tok_1");
  });

  it("sobrescribe la sesión anterior en vez de acumularla", () => {
    setStoredInternalSession(validSession());
    setStoredInternalSession(
      validSession({
        user: { ...validSession().user, email: "otra@atlas.internal" },
      }),
    );

    expect(getStoredInternalSession()?.user.email).toBe("otra@atlas.internal");
  });
});

describe("clearStoredInternalSession", () => {
  it("borra la clave v3 y las legadas", () => {
    setStoredInternalSession(validSession());
    writeRaw(LEGACY_SESSION_KEY, validSession(), window.sessionStorage);
    writeRaw(LEGACY_LOCAL_STORAGE_KEY, validSession(), window.localStorage);

    clearStoredInternalSession();

    expect(getStoredInternalSession()).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("no lanza si no había sesión", () => {
    expect(() => clearStoredInternalSession()).not.toThrow();
  });
});
