import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/api/client", () => ({
  apiRequest: vi.fn(),
}));

import { createInternalUser } from "@/features/internal-users/services";
import { apiRequest } from "@/shared/api/client";
import type { CreateInternalUserInput } from "@/features/internal-users/types";

const mockedApiRequest = vi.mocked(apiRequest);

const SIGNUP_PATH = "/internal/auth/signup";

function input(): CreateInternalUserInput {
  return {
    email: "nuevo@atlas.internal",
    fullName: "Nuevo Analista",
    department: "RISK",
    jobTitle: "Analista",
    roles: ["INTERNAL_ANALYST"],
    reason: "Alta solicitada por gerencia de Riesgo",
  };
}

const signupResponse = { id: "u1", email: "nuevo@atlas.internal" };

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue(signupResponse as never);
});

function signupBody(): Record<string, unknown> {
  const call = mockedApiRequest.mock.calls.find(
    (entry) => entry[0] === SIGNUP_PATH,
  );
  return (call?.[1] as { body: Record<string, unknown> }).body;
}

describe("createInternalUser", () => {
  /**
   * `createInternalUserSchema` del backend exige `roles` (mínimo uno) y `reason` (mínimo ocho
   * caracteres). El portal no los mandaba, así que el alta respondía SIEMPRE 400 «Entrada inválida
   * en body.» — dar de alta a alguien desde el portal no funcionaba en ningún caso, mientras el
   * formulario pedía los dos campos y los tiraba.
   */
  it("manda el contrato COMPLETO que el backend exige", async () => {
    await createInternalUser(input());

    const body = signupBody();
    expect(body.roles).toEqual(["INTERNAL_ANALYST"]);
    expect(String(body.reason).length).toBeGreaterThanOrEqual(8);
    expect(body.email).toBe("nuevo@atlas.internal");
    expect(body.fullName).toBe("Nuevo Analista");
    expect(body.department).toBe("RISK");
    expect(body.jobTitle).toBe("Analista");
  });

  it("la contraseña temporal cumple el mínimo de diez caracteres del backend", async () => {
    const result = await createInternalUser(input());

    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(10);
    expect(signupBody().password).toBe(result.temporaryPassword);
  });

  it("fuerza el cambio de contraseña: la temporal no debe sobrevivir al primer login", async () => {
    await createInternalUser(input());

    expect(signupBody().mustChangePassword).toBe(true);
  });

  /**
   * Un alta atómica es la diferencia entre una cuenta que existe entera y una cuenta sin permisos,
   * con una contraseña que sólo vivía en la memoria de una pestaña y el correo ya tomado para
   * volver a intentarlo.
   */
  it("es UNA sola llamada: sin pasos posteriores que puedan dejar el alta a medias", async () => {
    await createInternalUser(input());

    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    expect(mockedApiRequest.mock.calls[0][0]).toBe(SIGNUP_PATH);
  });

  it("un cargo vacío no se envía en vez de mandarse como cadena vacía", async () => {
    await createInternalUser({ ...input(), jobTitle: "" });

    expect(signupBody()).not.toHaveProperty("jobTitle");
  });

  it("devuelve el usuario creado y su contraseña", async () => {
    const result = await createInternalUser(input());

    expect(result.user.id).toBe("u1");
    expect(result.temporaryPassword).toBeTruthy();
  });

  it("acepta la respuesta envuelta en `user`", async () => {
    mockedApiRequest.mockResolvedValue({ user: signupResponse } as never);

    const result = await createInternalUser(input());

    expect(result.user.id).toBe("u1");
  });

  it("propaga el error del signup: no se creó ninguna cuenta que reportar", async () => {
    mockedApiRequest.mockRejectedValue(new Error("email duplicado"));

    await expect(createInternalUser(input())).rejects.toThrow(
      "email duplicado",
    );
  });
});
