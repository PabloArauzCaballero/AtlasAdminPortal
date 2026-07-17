import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertHostAllowed,
  getQaTrustedHosts,
  isHostAllowed,
} from "@/features/qa-lab/qa-safety";

const PORTAL_API_BASE_URL = "https://api.atlas.internal/api/v1";

beforeEach(() => {
  // Entorno determinista: sin esto, las bases dependerían de .env.local.
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", PORTAL_API_BASE_URL);
  vi.stubEnv("NEXT_PUBLIC_STAGING_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_PROD_READONLY_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_LOCAL_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "");
});

describe("isHostAllowed · bases propias del portal", () => {
  it("confía en la base configurada del portal sin allowlist alguna", () => {
    expect(isHostAllowed(`${PORTAL_API_BASE_URL}/internal/users`)).toBe(true);
  });

  it("confía en el backend local que el selector de base ofrece por defecto", () => {
    expect(isHostAllowed("http://localhost:3005/api/v1/internal/users")).toBe(
      true,
    );
  });

  it("confía en la base de staging cuando está configurada", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_STAGING_API_BASE_URL",
      "https://staging-api.atlas.internal/api/v1",
    );
    expect(isHostAllowed("https://staging-api.atlas.internal/health")).toBe(
      true,
    );
  });
});

describe("isHostAllowed · hosts escritos por el operador", () => {
  it("bloquea un host absoluto que no está en la allowlist", () => {
    expect(isHostAllowed("https://evil.example.com/collect")).toBe(false);
  });

  it("permite un host absoluto declarado en la allowlist", () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "qa-sandbox.atlas.internal");
    expect(isHostAllowed("https://qa-sandbox.atlas.internal/ping")).toBe(true);
  });

  it("tolera espacios y entradas vacías en la allowlist", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_QA_ALLOWED_HOSTS",
      " qa-sandbox.atlas.internal , , otro.atlas.internal ",
    );
    expect(isHostAllowed("https://otro.atlas.internal/ping")).toBe(true);
  });

  it("compara el host sin distinguir mayúsculas", () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "qa-sandbox.atlas.internal");
    expect(isHostAllowed("https://QA-Sandbox.Atlas.Internal/ping")).toBe(true);
  });

  it("distingue el puerto: otro puerto es otro host", () => {
    expect(isHostAllowed("http://localhost:9999/api/v1/internal/users")).toBe(
      false,
    );
  });

  it("no deja que un subdominio del host permitido cuele", () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "qa-sandbox.atlas.internal");
    expect(isHostAllowed("https://qa-sandbox.atlas.internal.evil.com/x")).toBe(
      false,
    );
  });
});

describe("isHostAllowed · entradas inválidas", () => {
  it("bloquea una URL que no parsea", () => {
    expect(isHostAllowed("no-es-una-url")).toBe(false);
  });

  it("bloquea esquemas que no son http/https", () => {
    expect(isHostAllowed("javascript:alert(1)")).toBe(false);
    expect(isHostAllowed("file:///etc/passwd")).toBe(false);
  });

  it("bloquea una cadena vacía", () => {
    expect(isHostAllowed("")).toBe(false);
  });
});

describe("assertHostAllowed", () => {
  it("no lanza para un host confiable", () => {
    expect(() =>
      assertHostAllowed(`${PORTAL_API_BASE_URL}/internal/users`),
    ).not.toThrow();
  });

  it("lanza y nombra el host bloqueado", () => {
    expect(() => assertHostAllowed("https://evil.example.com/collect")).toThrow(
      /evil\.example\.com/,
    );
  });

  it("lanza mencionando la variable que abre la allowlist", () => {
    expect(() => assertHostAllowed("https://evil.example.com/collect")).toThrow(
      /NEXT_PUBLIC_QA_ALLOWED_HOSTS/,
    );
  });

  it("lanza para una URL inválida", () => {
    expect(() => assertHostAllowed("no-es-una-url")).toThrow();
  });
});

describe("getQaTrustedHosts", () => {
  it("une bases propias y allowlist sin duplicados", () => {
    vi.stubEnv("NEXT_PUBLIC_QA_ALLOWED_HOSTS", "localhost:3005,extra.internal");
    const hosts = getQaTrustedHosts();
    expect(hosts).toContain("api.atlas.internal");
    expect(hosts).toContain("extra.internal");
    expect(hosts.filter((host) => host === "localhost:3005")).toHaveLength(1);
  });

  it("nunca incluye un host arbitrario por defecto", () => {
    expect(getQaTrustedHosts()).not.toContain("evil.example.com");
  });
});
