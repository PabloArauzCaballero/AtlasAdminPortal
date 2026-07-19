import { afterEach, describe, expect, it, vi } from "vitest";
import { newIdempotencyKey } from "@/shared/api/idempotency";
import { buildRequestInit } from "@/shared/api/request-init";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newIdempotencyKey", () => {
  it("devuelve una cadena no vacía", () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(0);
  });

  it("genera llaves únicas", () => {
    const keys = new Set(
      Array.from({ length: 200 }, () => newIdempotencyKey()),
    );
    expect(keys.size).toBe(200);
  });

  it("usa el fallback (hex + contador) cuando no hay randomUUID", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => real.getRandomValues(arr),
    });

    const a = newIdempotencyKey();
    const b = newIdempotencyKey();

    expect(a).toMatch(/^idk-/);
    expect(a).not.toBe(b);
  });
});

describe("buildRequestInit · Idempotency-Key", () => {
  function headersOf(init: ReturnType<typeof buildRequestInit>) {
    return init.headers as Record<string, string>;
  }

  it("añade la llave en una mutación (POST)", () => {
    const init = buildRequestInit(
      { method: "POST", body: {}, idempotencyKey: "idk-123" },
      null,
    );
    expect(headersOf(init)["Idempotency-Key"]).toBe("idk-123");
  });

  it("ignora la llave en un GET (no es una mutación)", () => {
    const init = buildRequestInit(
      { method: "GET", idempotencyKey: "idk-123" },
      null,
    );
    expect(headersOf(init)["Idempotency-Key"]).toBeUndefined();
  });

  it("sin llave no añade el header", () => {
    const init = buildRequestInit({ method: "POST", body: {} }, null);
    expect(headersOf(init)["Idempotency-Key"]).toBeUndefined();
  });

  it("la llave sobrevive al spread de opciones (reintento reusa la misma)", () => {
    const options = { method: "PATCH" as const, idempotencyKey: "idk-xyz" };
    const init = buildRequestInit({ ...options, skipRefresh: true }, null);
    expect(headersOf(init)["Idempotency-Key"]).toBe("idk-xyz");
  });
});
