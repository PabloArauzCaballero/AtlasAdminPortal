import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse, type NextRequest } from "next/server";
import { middleware } from "@/middleware";

vi.mock("next/server", () => ({
  NextResponse: { next: vi.fn(() => ({ headers: new Headers() })) },
}));
vi.mock("@/shared/api/config", () => ({
  getApiBaseUrl: () => "https://api.qa.example.test/api/v1",
}));

function responseForRequest() {
  return middleware({ headers: new Headers() } as NextRequest);
}

beforeEach(() => vi.mocked(NextResponse.next).mockClear());

describe("CSP del middleware", () => {
  it("emite un nonce distinto por petición en request y response", () => {
    vi.stubEnv("NODE_ENV", "production");
    const first = responseForRequest().headers.get("Content-Security-Policy")!;
    const forwarded = vi.mocked(NextResponse.next).mock.calls[0]?.[0]?.request
      ?.headers;
    expect(forwarded?.get("Content-Security-Policy")).toBe(first);
    const firstNonce = first.match(/'nonce-([^']+)'/)?.[1];
    expect(firstNonce).toMatch(/^[a-f0-9]{32}$/);
    expect(forwarded?.get("x-nonce")).toBe(firstNonce);

    const second = responseForRequest().headers.get("Content-Security-Policy")!;
    expect(second.match(/'nonce-([^']+)'/)?.[1]).not.toBe(firstNonce);
  });

  it("bloquea objetos y framing y limita conexiones en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    const policy = responseForRequest().headers.get("Content-Security-Policy")!;
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("connect-src 'self' https://api.qa.example.test");
    expect(policy).toContain("frame-src 'self' blob:");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy.match(/script-src ([^;]+)/)?.[1]).not.toContain(
      "'unsafe-inline'",
    );
  });

  it("sólo permite unsafe-eval para HMR en desarrollo", () => {
    vi.stubEnv("NODE_ENV", "development");
    const policy = responseForRequest().headers.get("Content-Security-Policy")!;
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain(
      "connect-src 'self' https://api.qa.example.test ws:",
    );
  });
});
