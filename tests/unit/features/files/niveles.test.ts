import { describe, expect, it } from "vitest";
import { NIVELES, alcanza } from "@/features/files/types";
import { formatearTamano } from "@/features/files/node-columns";

/**
 * La escala de acceso y cómo se lee un tamaño.
 *
 * `alcanza` decide qué botones existen en la pantalla. Si se equivocara hacia arriba, se ofrecerían
 * acciones que el backend va a rechazar —y quien las usa aprende a desconfiar de todos los
 * botones—; si se equivocara hacia abajo, un analista con permiso creería que no lo tiene y
 * pediría por otro canal lo que ya podía hacer.
 */
describe("alcanza", () => {
  it("sin nivel no alcanza ni para leer", () => {
    expect(alcanza(null, "leer")).toBe(false);
  });

  it("un nivel alcanza al suyo y a los de más abajo", () => {
    expect(alcanza("compartir", "compartir")).toBe(true);
    expect(alcanza("compartir", "escribir")).toBe(true);
    expect(alcanza("compartir", "leer")).toBe(true);
  });

  it("no alcanza a los de más arriba", () => {
    expect(alcanza("escribir", "compartir")).toBe(false);
    expect(alcanza("leer", "administrar")).toBe(false);
  });

  it("la escala va de menor a mayor y administrar es el techo", () => {
    expect(NIVELES).toEqual(["leer", "escribir", "compartir", "administrar"]);
    expect(NIVELES.every((nivel) => alcanza("administrar", nivel))).toBe(true);
  });
});

describe("formatearTamano", () => {
  it("un archivo sin tamaño no se enseña como 0 bytes", () => {
    // Cero y «no se sabe» son cosas distintas: un archivo de 0 bytes es un fallo de subida.
    expect(formatearTamano(null)).toBe("—");
    expect(formatearTamano("0")).toBe("—");
  });

  it("sube de unidad donde una persona lo haría", () => {
    expect(formatearTamano("512")).toBe("512 B");
    expect(formatearTamano("2048")).toBe("2.0 kB");
    expect(formatearTamano("3145728")).toBe("3.0 MB");
  });
});
