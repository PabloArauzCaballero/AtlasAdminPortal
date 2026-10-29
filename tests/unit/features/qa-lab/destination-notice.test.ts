import { describe, expect, it } from "vitest";
import { avisoDeDestino } from "@/features/qa-lab/destination-notice";

const erp = {
  backendService: "atlas-erp-backend",
  backendBaseUrl: "http://localhost:3010",
};

describe("avisoDeDestino", () => {
  it("correcto: operación del ERP con «API de este portal» avisa del servicio dueño", () => {
    const aviso = avisoDeDestino(erp, "CONFIGURED_API");
    expect(aviso).toContain("atlas-erp-backend");
    expect(aviso).toContain("http://localhost:3010");
    expect(aviso).toContain("404");
  });

  it("límite: una ruta base desconocida cae en la del portal y también avisa", () => {
    expect(avisoDeDestino(erp, "clave-vieja")).not.toBeNull();
    expect(avisoDeDestino(erp, undefined)).not.toBeNull();
  });

  it("límite: sin dirección conocida el aviso sigue sin paréntesis vacíos", () => {
    const aviso = avisoDeDestino(
      { backendService: "atlas-erp-backend", backendBaseUrl: null },
      "CONFIGURED_API",
    );
    expect(aviso).not.toContain("()");
  });

  it("inválido: sin operación, sin servicio o de AtlasBackend no hay aviso", () => {
    expect(avisoDeDestino(undefined, "CONFIGURED_API")).toBeNull();
    expect(avisoDeDestino({}, "CONFIGURED_API")).toBeNull();
    expect(
      avisoDeDestino({ backendService: "  " }, "CONFIGURED_API"),
    ).toBeNull();
    expect(
      avisoDeDestino({ backendService: "atlas-backend" }, "CONFIGURED_API"),
    ).toBeNull();
  });

  it("inválido: si el operador ya eligió otra dirección o el simulador, no se le avisa", () => {
    expect(avisoDeDestino(erp, "CUSTOM_HOST")).toBeNull();
    expect(avisoDeDestino(erp, "MOCK_PROVIDERS")).toBeNull();
  });
});
