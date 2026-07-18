import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/client", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/shared/api/client";
import {
  getInternalMe,
  loginInternal,
  logoutInternal,
  refreshInternal,
} from "@/shared/auth/auth-service";

const mockedApiRequest = vi.mocked(apiRequest);

/** Payload del backend con la forma "alternativa" de roles/permisos. */
function authPayload() {
  return {
    accessToken: "tok_nuevo",
    tokenType: "Bearer" as const,
    user: {
      id: "1",
      tenantId: "acme",
      email: "qa@atlas.internal",
      fullName: "QA Operator",
      status: "ACTIVE",
      roles: [{ key: "INTERNAL_ADMIN" }],
      effectivePermissions: [{ key: "internal.users.manage" }],
    },
  };
}

function lastCall() {
  const [path, options] = mockedApiRequest.mock.calls.at(-1) ?? [];
  return { path, options: options as Record<string, unknown> };
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("loginInternal", () => {
  const credentials = {
    tenantId: "acme",
    email: "qa@atlas.internal",
    password: "secreto",
  };

  it("hace POST al endpoint de login con las credenciales", async () => {
    mockedApiRequest.mockResolvedValue(authPayload());

    await loginInternal(credentials);

    const { path, options } = lastCall();
    expect(path).toBe("/internal/auth/login");
    expect(options.method).toBe("POST");
    expect(options.body).toEqual(credentials);
  });

  it("no adjunta el token de una sesión anterior", async () => {
    // Un token viejo o caducado en el login puede hacer que el backend responda
    // 401 por la cabecera en vez de evaluar las credenciales enviadas.
    mockedApiRequest.mockResolvedValue(authPayload());

    await loginInternal(credentials);

    expect(lastCall().options.skipAuth).toBe(true);
  });

  it("manda el tenant del formulario, que aún no está en ninguna sesión", async () => {
    mockedApiRequest.mockResolvedValue(authPayload());

    await loginInternal(credentials);

    expect(lastCall().options.tenantId).toBe("acme");
  });

  it("normaliza roles y permisos en forma de objeto a string[]", async () => {
    // El backend responde `[{ key }]` bajo `effectivePermissions`. Si el login
    // guardara eso crudo, `parseSession` descartaría la sesión en el próximo
    // arranque y expulsaría al operador.
    mockedApiRequest.mockResolvedValue(authPayload());

    const session = await loginInternal(credentials);

    expect(session.user.permissions).toEqual(["internal.users.manage"]);
    expect(session.user.roles).toEqual(["INTERNAL_ADMIN"]);
  });

  it("propaga el error del backend sin envolverlo", async () => {
    // La pantalla de login distingue 401 de 403: tragarse el error rompería eso.
    const error = new Error("credenciales inválidas");
    mockedApiRequest.mockRejectedValue(error);

    await expect(loginInternal(credentials)).rejects.toBe(error);
  });
});

describe("getInternalMe", () => {
  it("consulta el perfil con la sesión actual", async () => {
    const profile = { user: { id: "1" } };
    mockedApiRequest.mockResolvedValue(profile);

    await expect(getInternalMe()).resolves.toBe(profile);
    expect(lastCall().path).toBe("/internal/auth/me");
  });

  it("va sin opciones: es un GET autenticado normal", async () => {
    mockedApiRequest.mockResolvedValue({ user: {} });

    await getInternalMe();

    expect(lastCall().options).toBeUndefined();
  });
});

describe("refreshInternal", () => {
  it("manda el refresh token en el cuerpo cuando lo hay (modo bearer)", async () => {
    mockedApiRequest.mockResolvedValue(authPayload());

    await refreshInternal("rt_1");

    const { path, options } = lastCall();
    expect(path).toBe("/internal/auth/refresh");
    expect(options.method).toBe("POST");
    expect(options.body).toEqual({ refreshToken: "rt_1" });
  });

  it("con refresh token adjunta también el Authorization", async () => {
    // `skipAuth: !refreshToken`: en modo bearer el backend espera ambos.
    mockedApiRequest.mockResolvedValue(authPayload());

    await refreshInternal("rt_1");

    expect(lastCall().options.skipAuth).toBe(false);
  });

  it("sin refresh token manda cuerpo vacío y se apoya solo en la cookie", async () => {
    // Modo cookie HttpOnly: el token no es legible por JS, lo pone el navegador.
    mockedApiRequest.mockResolvedValue(authPayload());

    await refreshInternal();

    const { options } = lastCall();
    expect(options.body).toEqual({});
    expect(options.skipAuth).toBe(true);
  });

  it("normaliza la sesión devuelta", async () => {
    mockedApiRequest.mockResolvedValue(authPayload());

    const session = await refreshInternal("rt_1");

    expect(session.user.permissions).toEqual(["internal.users.manage"]);
  });

  it("marca la sesión como Cookie cuando el backend no devuelve accessToken", async () => {
    // Es lo que decide si el cliente adjunta Authorization o confía en cookies.
    mockedApiRequest.mockResolvedValue({
      user: { id: "1", email: "qa@atlas.internal", roles: [], permissions: [] },
    });

    const session = await refreshInternal();

    expect(session.tokenType).toBe("Cookie");
  });
});

describe("logoutInternal", () => {
  it("manda el refresh token a revocar y no cierra el resto de dispositivos", async () => {
    // `allDevices: false` es deliberado: cerrar sesión en un navegador no debe
    // echar al operador de sus otras sesiones.
    mockedApiRequest.mockResolvedValue({ loggedOut: true });

    await logoutInternal("rt_1");

    const { path, options } = lastCall();
    expect(path).toBe("/internal/auth/logout");
    expect(options.method).toBe("POST");
    expect(options.body).toEqual({ refreshToken: "rt_1", allDevices: false });
    expect(options.skipAuth).toBe(false);
  });

  it("sin refresh token revoca la sesión de cookie", async () => {
    mockedApiRequest.mockResolvedValue({ loggedOut: true });

    await logoutInternal();

    const { options } = lastCall();
    expect(options.body).toEqual({ allDevices: false });
    expect(options.skipAuth).toBe(true);
  });

  it("devuelve la respuesta del backend", async () => {
    mockedApiRequest.mockResolvedValue({ loggedOut: true });

    await expect(logoutInternal("rt_1")).resolves.toEqual({ loggedOut: true });
  });
});
