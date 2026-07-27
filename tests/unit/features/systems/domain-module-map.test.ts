import { describe, expect, it } from "vitest";
import {
  moduleDescription,
  moduleKeyForDomainCode,
  normalizeModule,
} from "@/features/systems/domain-module-map";

describe("domain-module-map", () => {
  it("normaliza guiones y mayúsculas a la misma clave", () => {
    expect(normalizeModule("External-Data")).toBe("external_data");
    expect(normalizeModule("  ADMIN ")).toBe("admin");
    expect(normalizeModule(null)).toBe("sin_dominio");
  });

  it("cruza domainCode a módulo", () => {
    expect(moduleKeyForDomainCode("PROVEEDORES")).toBe("external_data");
    expect(moduleKeyForDomainCode("IDENTIDAD_KYC")).toBe("customers");
    // Un domainCode desconocido cae a su propia forma normalizada.
    expect(moduleKeyForDomainCode("DESCONOCIDO")).toBe("desconocido");
  });

  it("da descripción de respaldo para los módulos que el backend no describe", () => {
    for (const key of ["operations", "admin", "auth", "catalog_management"]) {
      expect(moduleDescription(key)?.length ?? 0).toBeGreaterThan(0);
    }
    // Acepta la forma con guiones (entidades) igual que con guiones bajos.
    expect(moduleDescription("catalog-management")).toBe(
      moduleDescription("catalog_management"),
    );
  });

  it("devuelve undefined para un módulo sin descripción conocida", () => {
    expect(moduleDescription("modulo_inexistente_xyz")).toBeUndefined();
  });
});
