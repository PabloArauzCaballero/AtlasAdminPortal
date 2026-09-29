import { describe, expect, it } from "vitest";
import { redirectWithParams } from "@/shared/lib/redirect-with-params";

describe("redirectWithParams — una ruta retirada llega a la misma búsqueda en la pantalla nueva", () => {
  it("conserva todos los parámetros y añade la pestaña", () => {
    expect(
      redirectWithParams(
        "/internal/lineage",
        { q: "loans", severity: "HIGH" },
        { vista: "impacto" },
      ),
    ).toBe("/internal/lineage?q=loans&severity=HIGH&vista=impacto");
  });

  it("la pestaña forzada gana sobre la que trajera la URL", () => {
    expect(
      redirectWithParams(
        "/internal/governance",
        { tab: "otra" },
        { tab: "datos-personales" },
      ),
    ).toBe("/internal/governance?tab=datos-personales");
  });

  it("repite los parámetros múltiples y omite los vacíos", () => {
    expect(redirectWithParams("/x", { module: ["a", "b"], q: undefined })).toBe(
      "/x?module=a&module=b",
    );
    expect(redirectWithParams("/x", {})).toBe("/x");
  });
});
