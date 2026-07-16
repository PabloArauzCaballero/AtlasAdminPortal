import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getApiBaseUrl,
  getApiTimeoutMs,
  getCsrfHeaderName,
} from "@/shared/api/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiBaseUrl", () => {
  it("usa el valor configurado", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal/api/v1");
    expect(getApiBaseUrl()).toBe("https://api.atlas.internal/api/v1");
  });

  it("recorta la barra final para no generar URLs con //", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_BASE_URL",
      "https://api.atlas.internal/api/v1/",
    );
    expect(getApiBaseUrl()).toBe("https://api.atlas.internal/api/v1");
  });

  it("ignora espacios alrededor del valor", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "  https://api.atlas.internal  ");
    expect(getApiBaseUrl()).toBe("https://api.atlas.internal");
  });

  it.each([
    ["no está definido", undefined],
    ["está vacío", ""],
    ["es solo espacios", "   "],
  ])("cae al default local si %s", (_label, value) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", value);
    expect(getApiBaseUrl()).toBe("http://localhost:3005/api/v1");
  });
});

describe("getApiTimeoutMs", () => {
  it("usa el timeout configurado", () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "20000");
    expect(getApiTimeoutMs()).toBe(20_000);
  });

  it("acepta el mínimo de 1000 ms", () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "1000");
    expect(getApiTimeoutMs()).toBe(1_000);
  });

  it.each([
    ["no está definido", undefined],
    ["no es numérico", "veinte-mil"],
    ["está vacío", ""],
    ["es menor al mínimo de 1000 ms", "500"],
    ["es negativo", "-5000"],
  ])("cae al default de 12000 ms si %s", (_label, value) => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", value);
    expect(getApiTimeoutMs()).toBe(12_000);
  });
});

describe("getCsrfHeaderName", () => {
  it("devuelve el header configurado", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", "x-atlas-csrf");
    expect(getCsrfHeaderName()).toBe("x-atlas-csrf");
  });

  it.each([
    ["no está definido", undefined],
    ["está vacío", ""],
    ["es solo espacios", "   "],
  ])("devuelve null si %s", (_label, value) => {
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", value);
    expect(getCsrfHeaderName()).toBeNull();
  });
});
