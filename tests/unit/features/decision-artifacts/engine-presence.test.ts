import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import {
  assignErrorText,
  catalogErrorText,
  enginePresence,
  versionStatusLabel,
} from "@/features/decision-artifacts/engine-presence";

const CATALOGO = [
  {
    code: "IDENTIDAD_CARNET_MOVIL",
    name: "Identidad",
    type: "IDENTITY_POLICY",
    latestVersion: "1.2.0",
    status: "COMPILED",
  },
];

const error = (status: number) =>
  new AtlasApiError({ status, code: "X", message: "x" });

describe("enginePresence", () => {
  it("distingue publicado, ausente, sin medir y sin asignar", () => {
    expect(
      enginePresence({ artifactCode: "IDENTIDAD_CARNET_MOVIL" }, CATALOGO),
    ).toBe("published");
    expect(
      enginePresence({ artifactCode: "RIESGO_ONBOARDING_CLIENTE" }, CATALOGO),
    ).toBe("missing");
    // Catálogo vacío: no se afirma que falte, porque no se pudo medir.
    expect(
      enginePresence({ artifactCode: "RIESGO_ONBOARDING_CLIENTE" }, []),
    ).toBe("unknown");
    expect(enginePresence({ artifactCode: null }, CATALOGO)).toBe("unset");
  });
});

describe("textos", () => {
  it("un 403 no se presenta como caída del servicio", () => {
    expect(catalogErrorText(error(403))).toMatch(/Tu rol no tiene acceso/);
    expect(catalogErrorText(error(500))).toMatch(/No se pudo leer/);
  });

  it("sólo el 422 dice que el motor no publica el artefacto", () => {
    expect(assignErrorText(error(422))).toMatch(/no publica/);
    expect(assignErrorText(error(403))).toMatch(/Tu rol/);
    expect(assignErrorText(error(500))).not.toMatch(/no publica/);
  });

  it("el estado de versión sale en palabras", () => {
    expect(versionStatusLabel("COMPILED")).toBe("compilada");
    expect(versionStatusLabel("SOMETHING_NEW")).toBe("something new");
    expect(versionStatusLabel(null)).toBeNull();
  });
});
