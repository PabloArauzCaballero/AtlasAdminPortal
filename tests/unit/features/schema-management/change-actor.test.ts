import { describe, expect, it } from "vitest";
import { requesterLabel } from "@/features/schema-management/change-actor";

// Hallazgo A4 (P-35): desde este portal propone un usuario INTERNO; antes la columna sólo sabía
// pintar el usuario de plataforma y mostraba «#null».
describe("requesterLabel", () => {
  it("nombra la población del proponente", () => {
    expect(
      requesterLabel({
        requesterInternalUserId: "7",
        requesterPlatformUserId: null,
      }),
    ).toBe("interno #7");
    expect(
      requesterLabel({
        requesterInternalUserId: null,
        requesterPlatformUserId: "10",
      }),
    ).toBe("plataforma #10");
  });

  it("tolera un backend anterior a A4 (sin el campo interno) y una fila sin proponente", () => {
    expect(requesterLabel({ requesterPlatformUserId: "10" })).toBe(
      "plataforma #10",
    );
    expect(requesterLabel({ requesterPlatformUserId: null })).toBe("—");
  });
});
