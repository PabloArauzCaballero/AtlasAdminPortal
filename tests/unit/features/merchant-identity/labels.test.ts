import { describe, expect, it } from "vitest";
import {
  MERCHANT_USER_STATUS_OPTIONS,
  formatCount,
  merchantUserStatusLabel,
  provisioningStatusLabel,
  statusChangeOptions,
} from "@/features/merchant-identity/labels";

describe("estados de la identidad de comercio", () => {
  it("traduce los cuatro estados y los de la petición", () => {
    expect(merchantUserStatusLabel("invited")).toBe("Invitada");
    expect(merchantUserStatusLabel("active")).toBe("Activa");
    expect(merchantUserStatusLabel("disabled")).toBe("Dada de baja");
    expect(provisioningStatusLabel("provisioned")).toBe("Concedida");
    expect(merchantUserStatusLabel("otro")).toBe("Otro estado (otro)");
  });

  it("cada opción dice qué significa, y ninguna es el código", () => {
    for (const opcion of MERCHANT_USER_STATUS_OPTIONS) {
      expect(opcion.description?.split(" ").length).toBeGreaterThan(4);
      expect(opcion.label).not.toBe(opcion.value);
    }
  });

  it("no ofrece pasar al estado en el que ya está", () => {
    const valores = statusChangeOptions("active").map((o) => o.value);
    expect(valores).not.toContain("active");
    expect(valores).toHaveLength(3);
  });
});

describe("formatCount", () => {
  it("con error dice «—», no un cero que parezca «ninguna»", () => {
    expect(
      formatCount({ isLoading: false, error: new Error("x"), total: 0 }),
    ).toBe("—");
  });

  it("mientras carga dice «…» y con datos, el total", () => {
    expect(
      formatCount({ isLoading: true, error: null, total: undefined }),
    ).toBe("…");
    expect(formatCount({ isLoading: false, error: null, total: 12 })).toBe(
      "12",
    );
  });
});
