import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiContractError,
  isApiContractError,
  validateContract,
} from "@/shared/api/contract";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  apiErrorPayloadSchema,
  paginatedSchema,
  paginationMetaSchema,
} from "@/shared/api/schemas";

const CTX = { endpoint: "/internal/things", method: "GET" as const };

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
});

describe("validateContract", () => {
  it("devuelve el dato cuando cumple el esquema", () => {
    const data = { id: "u1", email: "a@example.invalid" };
    expect(validateContract(userSchema, data, CTX)).toEqual(data);
  });

  it("conserva los campos extra que el backend añada (no los recorta)", () => {
    const data = { id: "u1", email: "a@example.invalid", nuevoCampo: 42 };
    const result = validateContract(userSchema, data, CTX) as typeof data;
    expect(result.nuevoCampo).toBe(42);
  });

  it("lanza ApiContractError si falta un campo requerido", () => {
    const error = capture(() => validateContract(userSchema, { id: "u1" }, CTX));
    expect(isApiContractError(error)).toBe(true);
  });

  it("lanza ApiContractError si un tipo no coincide", () => {
    const error = capture(() =>
      validateContract(userSchema, { id: 1, email: "a@x.invalid" }, CTX),
    );
    expect(isApiContractError(error)).toBe(true);
  });

  it("un ApiContractError también es AtlasApiError con code API_CONTRACT_ERROR", () => {
    const error = capture(() =>
      validateContract(userSchema, {}, CTX),
    ) as ApiContractError;
    expect(isAtlasApiError(error)).toBe(true);
    expect(error.code).toBe("API_CONTRACT_ERROR");
    expect(error.status).toBe(0);
  });

  it("guarda endpoint, método y requestId en el error", () => {
    const error = capture(() =>
      validateContract(userSchema, {}, { ...CTX, requestId: "req_9" }),
    ) as ApiContractError;
    expect(error.endpoint).toBe("/internal/things");
    expect(error.method).toBe("GET");
    expect(error.requestId).toBe("req_9");
  });

  describe("redacción: el error no arrastra valores (PII)", () => {
    it("issues lista rutas de campos, no valores", () => {
      const error = capture(() =>
        validateContract(userSchema, { id: 1, email: 2 }, CTX),
      ) as ApiContractError;
      expect(error.issues).toContain("id");
      expect(error.issues).toContain("email");
    });

    it("no filtra el valor sensible del dato inválido", () => {
      const data = { id: "u1", email: 12345, secreto: "pii-super-secreta" };
      const error = capture(() =>
        validateContract(userSchema, data, CTX),
      ) as ApiContractError;
      const serializado = `${error.message} ${error.issues}`;
      expect(serializado).not.toContain("pii-super-secreta");
      expect(serializado).not.toContain("12345");
    });
  });
});

describe("paginationMetaSchema", () => {
  it("acepta una meta bien formada", () => {
    const meta = { page: 1, limit: 20, total: 3, totalPages: 1 };
    expect(paginationMetaSchema.safeParse(meta).success).toBe(true);
  });

  it("rechaza una meta con campos no numéricos", () => {
    const meta = { page: "1", limit: 20, total: 3, totalPages: 1 };
    expect(paginationMetaSchema.safeParse(meta).success).toBe(false);
  });
});

describe("paginatedSchema", () => {
  const schema = paginatedSchema(z.object({ id: z.string() }));

  it("valida un listado paginado correcto", () => {
    const envelope = {
      items: [{ id: "a" }, { id: "b" }],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    };
    expect(schema.safeParse(envelope).success).toBe(true);
  });

  it("rechaza si un item del listado no cumple", () => {
    const envelope = {
      items: [{ id: "a" }, { noId: true }],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    };
    expect(schema.safeParse(envelope).success).toBe(false);
  });

  it("rechaza si falta la meta de paginación", () => {
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe("apiErrorPayloadSchema", () => {
  it("valida el sobre de error del backend", () => {
    const payload = {
      requestId: "req_1",
      error: { code: "FORBIDDEN", message: "No." },
      timestamp: "2026-07-17T00:00:00.000Z",
    };
    expect(apiErrorPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rechaza un error sin code", () => {
    const payload = {
      error: { message: "No." },
      timestamp: "2026-07-17T00:00:00.000Z",
    };
    expect(apiErrorPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

function capture(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Se esperaba que lanzara y no lo hizo.");
}
