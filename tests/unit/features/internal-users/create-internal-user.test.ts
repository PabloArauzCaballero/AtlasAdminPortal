import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/client", () => ({
  apiRequest: vi.fn(),
}));

import { createInternalUser } from "@/features/internal-users/services";
import { apiRequest } from "@/shared/api/client";
import type { CreateInternalUserInput } from "@/features/internal-users/types";

const mockedApiRequest = vi.mocked(apiRequest);

const SIGNUP_PATH = "/internal/auth/signup";
const ROLES_PATH = "/internal/users/u1/roles";
const USER_PATH = "/internal/users/u1";

function input(): CreateInternalUserInput {
  return {
    email: "nuevo@atlas.internal",
    fullName: "Nuevo Analista",
    department: "RISK",
    roles: ["INTERNAL_ANALYST"],
    reason: "Alta solicitada por gerencia de Riesgo",
  };
}

const signupResponse = { id: "u1", email: "nuevo@atlas.internal" };

/** Responde OK al signup y delega el resto a `rest`. */
function mockFlow(rest: (path: string) => Promise<unknown>) {
  mockedApiRequest.mockImplementation(((path: string) => {
    if (path === SIGNUP_PATH) return Promise.resolve(signupResponse);
    return rest(path);
  }) as unknown as typeof apiRequest);
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("createInternalUser · camino feliz", () => {
  it("devuelve usuario, contraseña y sin warnings", async () => {
    mockFlow(() => Promise.resolve({}));

    const result = await createInternalUser(input());

    expect(result.user.id).toBe("u1");
    expect(result.temporaryPassword).toBeTruthy();
    expect(result.warnings).toEqual([]);
  });
});

describe("createInternalUser · fallo parcial", () => {
  it("si falla la asignación de roles, resuelve igual con la contraseña", async () => {
    mockFlow((path) =>
      path === ROLES_PATH
        ? Promise.reject(new Error("500"))
        : Promise.resolve({}),
    );

    const result = await createInternalUser(input());

    // Lo crítico: la contraseña temporal llega al admin igual.
    expect(result.temporaryPassword).toBeTruthy();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/roles/i);
  });

  it("si falla forzar el cambio de contraseña, resuelve igual y avisa", async () => {
    mockFlow((path) =>
      path === USER_PATH
        ? Promise.reject(new Error("500"))
        : Promise.resolve({}),
    );

    const result = await createInternalUser(input());

    expect(result.temporaryPassword).toBeTruthy();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/contraseña/i);
  });

  it("si fallan ambos pasos, acumula los dos warnings", async () => {
    mockFlow((path) =>
      path === SIGNUP_PATH
        ? Promise.resolve(signupResponse)
        : Promise.reject(new Error("500")),
    );

    const result = await createInternalUser(input());

    expect(result.temporaryPassword).toBeTruthy();
    expect(result.warnings).toHaveLength(2);
  });

  it("el paso de roles no se intenta si no se seleccionó ninguno", async () => {
    mockFlow(() => Promise.resolve({}));

    const result = await createInternalUser({ ...input(), roles: [] });

    const calledPaths = mockedApiRequest.mock.calls.map((call) => call[0]);
    expect(calledPaths).not.toContain(ROLES_PATH);
    expect(result.warnings).toEqual([]);
  });
});

describe("createInternalUser · fallo del signup", () => {
  it("propaga el error: no se creó ninguna cuenta que reportar", async () => {
    mockedApiRequest.mockRejectedValue(new Error("email duplicado"));

    await expect(createInternalUser(input())).rejects.toThrow(
      "email duplicado",
    );
  });
});
