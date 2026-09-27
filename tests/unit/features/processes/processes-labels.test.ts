import { describe, expect, it } from "vitest";
import { clientLabel, stageHref, WIRING } from "@/features/processes/labels";

describe("stageHref", () => {
  it("enlaza una pantalla de este portal", () => {
    expect(
      stageHref("ADMIN_PORTAL", "/internal/operations/pending-contacts"),
    ).toBe("/internal/operations/pending-contacts");
  });

  it("no enlaza pantallas de otros portales ni rutas fuera de /internal", () => {
    expect(stageHref("ERP_PORTAL", "/internal/partners")).toBeNull();
    expect(
      stageHref("ADMIN_PORTAL", "{MOTOR}/manual-reviews/{instanceId}"),
    ).toBeNull();
    expect(stageHref("ADMIN_PORTAL", null)).toBeNull();
  });

  it("una ruta con parámetros sólo se enlaza con un caso con el que rellenarla", () => {
    const screen =
      "/internal/operations/customers/:customerId/investigation-summary";
    expect(stageHref("ADMIN_PORTAL", screen)).toBeNull();
    expect(stageHref("ADMIN_PORTAL", screen, "42")).toBe(
      "/internal/operations/customers/42/investigation-summary",
    );
    expect(stageHref("ADMIN_PORTAL", "/internal/x/[id]/y/{other}", "7")).toBe(
      "/internal/x/7/y/7",
    );
  });
});

describe("vocabulario", () => {
  it("traduce códigos conocidos y deja tal cual los desconocidos", () => {
    expect(clientLabel("ADMIN_PORTAL")).toBe("Portal interno");
    expect(clientLabel("NUEVO_PORTAL")).toBe("NUEVO_PORTAL");
    expect(clientLabel(null)).toBe("—");
  });

  it("«sin pantalla» es el único estado de cableado en rojo", () => {
    const rojos = Object.entries(WIRING)
      .filter(([, value]) => value.tone === "critical")
      .map(([key]) => key);
    expect(rojos).toEqual(["unwired"]);
  });
});
