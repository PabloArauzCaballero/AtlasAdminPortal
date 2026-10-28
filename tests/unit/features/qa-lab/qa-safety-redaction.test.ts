import { describe, expect, it } from "vitest";
import { redactedHeaders } from "@/features/qa-lab/qa-safety";

/**
 * Auditoría 2026-10-28 (COBIT 5 DSS05.07 / DSS06): `redactedHeaders` dejaba los cuatro primeros y los
 * cuatro últimos caracteres de una cabecera sensible. Con un valor de 9 a 16 caracteres eso es casi
 * todo el secreto, y el resultado se guarda en el historial y en el registro del laboratorio.
 */
describe("redactedHeaders · una cabecera sensible no enseña ningún fragmento", () => {
  const SECRETO_CORTO = "s3cr3t-key"; // 10 caracteres: antes salían 8
  const SECRETO_LARGO = "Bearer abcdefghijklmnopqrstuvwxyz0123456789";

  it("correcto: las cabeceras sensibles salen sin su valor y las demás intactas", () => {
    const out = redactedHeaders({
      Authorization: SECRETO_LARGO,
      Cookie: "sid=valor-de-sesion-0123456789",
      "X-Api-Key": SECRETO_CORTO,
      Accept: "application/json",
    });

    expect(out.Authorization).toBe("[redacted]");
    expect(out.Cookie).toBe("[redacted]");
    expect(out["X-Api-Key"]).toBe("[redacted]");
    expect(out.Accept).toBe("application/json");
  });

  it("límite: valores vacíos, de un carácter, de 8 y de 9 caracteres no revelan nada", () => {
    for (const value of ["", "x", "12345678", "123456789"]) {
      const out = redactedHeaders({ Authorization: value });
      expect(out.Authorization).toBe("[redacted]");
    }
  });

  it("inválido: ningún fragmento del secreto sobrevive en la salida serializada", () => {
    const out = JSON.stringify(
      redactedHeaders({
        Authorization: SECRETO_LARGO,
        "X-Api-Key": SECRETO_CORTO,
        "X-CSRF-Token": "csrf-0123456789abcdef",
      }),
    );

    for (const fragmento of ["Bear", "6789", "s3cr", "-key", "csrf", "cdef"]) {
      expect(out).not.toContain(fragmento);
    }
  });
});
