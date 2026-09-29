import { beforeEach, describe, expect, it, vi } from "vitest";
import AlertsPage from "@/app/internal/alerts/page";
import FormsPage from "@/app/internal/forms/page";
import { redirectTarget } from "@/shared/lib/redirect-target";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirect(target),
}));

beforeEach(() => redirect.mockReset());

describe("rutas fusionadas: redirigen con sus parámetros (sin 404 en marcadores)", () => {
  it("/internal/alerts → bandeja de calidad, conservando la consulta", async () => {
    await AlertsPage({
      searchParams: Promise.resolve({ status: "open", severity: "CRITICAL" }),
    });
    expect(redirect).toHaveBeenCalledWith(
      "/internal/data-quality/issues?status=open&severity=CRITICAL",
    );
  });

  it("/internal/forms → Versiones de esquema, donde vive la misma tabla", async () => {
    await FormsPage({ searchParams: Promise.resolve({}) });
    expect(redirect).toHaveBeenCalledWith("/internal/schema/versions");
  });

  it("redirectTarget repite parámetros múltiples y aplica alias sin tocar valores", () => {
    expect(
      redirectTarget("/x", { a: ["1", "2"], b: "3", c: undefined }, { b: "d" }),
    ).toBe("/x?a=1&a=2&d=3");
  });
});
