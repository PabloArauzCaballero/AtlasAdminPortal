import { describe, expect, it } from "vitest";
import { statusTone } from "@/shared/components/ui/badges";

/**
 * Tabla de estados: un semáforo que pinta gris un `BLOCKED` o un `WARNING` no
 * es un semáforo. Cada valor con carga semántica debe tener su tono.
 */
describe("statusTone · verdes", () => {
  it.each(["ACTIVE", "PASSED", "ENABLED", "OK", "READY"])(
    "%s es success",
    (value) => {
      expect(statusTone(value)).toBe("success");
    },
  );
});

describe("statusTone · rojos", () => {
  it.each(["FAILED", "DISABLED", "ERROR", "REJECTED", "BLOCKED"])(
    "%s es critical",
    (value) => {
      expect(statusTone(value)).toBe("critical");
    },
  );
});

describe("statusTone · ámbares", () => {
  it.each(["NEEDS_REVIEW", "RUNNING", "QUEUED", "WARNING", "INCOMPLETE"])(
    "%s es warning",
    (value) => {
      expect(statusTone(value)).toBe("warning");
    },
  );
});

describe("statusTone · casos que el bug pintaba gris", () => {
  it("WARNING (journey de QA con fallos) no es gris", () => {
    expect(statusTone("WARNING")).not.toBe("default");
  });

  it("BLOCKED (release bloqueado) no es gris", () => {
    expect(statusTone("BLOCKED")).not.toBe("default");
  });

  it("READY / INCOMPLETE (readiness de reportes) no son grises", () => {
    expect(statusTone("READY")).not.toBe("default");
    expect(statusTone("INCOMPLETE")).not.toBe("default");
  });
});

describe("statusTone · normalización y bordes", () => {
  it("no distingue mayúsculas", () => {
    expect(statusTone("blocked")).toBe("critical");
    expect(statusTone("ready")).toBe("success");
  });

  it("sin valor es muted", () => {
    expect(statusTone(null)).toBe("muted");
    expect(statusTone(undefined)).toBe("muted");
    expect(statusTone("")).toBe("muted");
  });

  it("un estado desconocido cae en default, no en un color inventado", () => {
    expect(statusTone("ALGO_NUEVO")).toBe("default");
  });
});
